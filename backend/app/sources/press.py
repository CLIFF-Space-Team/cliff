"""Türkçe basında asteroit / uzay haberleri — RSS aggregator.

Birden fazla Türkçe haber/eğitim RSS feed'ini paralel çeker, anahtar kelime
filtresinden geçirir, birleştirip tarihe göre sıralar. feedparser yerine
httpx + xml.etree (zero new dependency) kullanır.

Kaynaklar fallback'lı: bir feed çökerse diğerleri çalışır. Hepsi başarısız
olursa frontend manuel `turkish-press.ts` listesine geri döner.
"""

from __future__ import annotations

import asyncio
import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import List, Optional

import httpx

from app.core.logging import get_logger
from app.nasa import cache

log = get_logger(__name__)

CACHE_TTL_SECONDS = 30 * 60  # 30 dk; haber RSS'leri yavaş güncellenir
HTTP_TIMEOUT = 12.0

# Anahtar kelimeler (case-insensitive). Asteroit/uzay-bilim odaklı.
KEYWORDS_RE = re.compile(
    r"asteroid|asteroit|meteor|gezegen savunmas|"
    r"\bNEO\b|near earth|yer-yak|yakın geçiş|"
    r"NASA|JAXA|ESA|TÜBİTAK|UYBSO|TÜG|"
    r"\bDART\b|Apophis|Bennu|Ryugu|İtokawa|Itokawa|"
    r"Çelyabinsk|Chelyabinsk|Tunguska|Hoba|"
    r"hava patlaması|uzay aracı|uzay sondası|fireball|ateş topu|"
    r"OSIRIS-REx|Hayabusa",
    re.IGNORECASE,
)


@dataclass
class PressArticle:
    id: str
    date: str  # ISO 8601
    title: str
    summary: str
    url: str
    source: str
    topic: str
    image_url: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "date": self.date,
            "title": self.title,
            "summary": self.summary,
            "url": self.url,
            "source": self.source,
            "topic": self.topic,
            "image_url": self.image_url,
        }


@dataclass
class FeedConfig:
    """RSS/Atom kaynak konfigürasyonu."""

    source: str  # UI'da gösterilen ad
    url: str
    default_topic: str = "egitim"


# Türkçe asteroit/uzay/eğitim feed'leri. URL'ler değişebilir; hata durumunda
# tek tek atlanır, diğerleri çalışmaya devam eder.
FEEDS: List[FeedConfig] = [
    FeedConfig(
        source="TÜBİTAK Bilim Genç",
        url="https://bilimgenc.tubitak.gov.tr/feed",
        default_topic="egitim",
    ),
    FeedConfig(
        source="Anadolu Ajansı · Bilim Teknoloji",
        url="https://www.aa.com.tr/tr/rss/default?cat=bilim-teknoloji",
        default_topic="cep-yakin-gecis",
    ),
    FeedConfig(
        source="TRT Haber · Bilim Teknoloji",
        url="https://www.trthaber.com/xml_mobile.php?tur=xml_genel&kategori=bilimteknoloji",
        default_topic="cep-yakin-gecis",
    ),
    FeedConfig(
        source="NASA · Resmi Bültenler",
        url="https://www.nasa.gov/feed/",
        default_topic="misyon",
    ),
    FeedConfig(
        source="BBC News · Science",
        url="https://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
        default_topic="cep-yakin-gecis",
    ),
    FeedConfig(
        source="ESA · Space News",
        url="https://www.esa.int/rssfeed/Our_Activities/Space_News",
        default_topic="misyon",
    ),
    FeedConfig(
        source="phys.org · Astronomy",
        url="https://phys.org/rss-feed/space-news/",
        default_topic="cep-yakin-gecis",
    ),
]

NS_MEDIA = "http://search.yahoo.com/mrss/"
NS_CONTENT = "http://purl.org/rss/1.0/modules/content/"


def _extract_image_url(item: ET.Element) -> Optional[str]:
    """RSS item'dan görsel URL'i çıkar. media:content > media:thumbnail > enclosure > content:encoded img."""
    # media:content
    media = item.find(f"{{{NS_MEDIA}}}content")
    if media is not None and media.get("url"):
        return media.get("url")
    # media:thumbnail
    thumb = item.find(f"{{{NS_MEDIA}}}thumbnail")
    if thumb is not None and thumb.get("url"):
        return thumb.get("url")
    # enclosure
    enc = item.find("enclosure")
    if enc is not None and enc.get("url") and (enc.get("type") or "").startswith("image"):
        return enc.get("url")
    # content:encoded içindeki ilk <img>
    encoded = item.find(f"{{{NS_CONTENT}}}encoded")
    if encoded is not None and encoded.text:
        m = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', encoded.text, re.IGNORECASE)
        if m:
            return m.group(1)
    # description içindeki ilk <img>
    desc = item.find("description")
    if desc is not None and desc.text:
        m = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', desc.text, re.IGNORECASE)
        if m:
            return m.group(1)
    return None


def _normalize_text(text: str) -> str:
    """HTML tag'lerini ve fazla boşlukları temizle."""
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _parse_pub_date(value: str) -> Optional[datetime]:
    if not value:
        return None
    # RSS 2.0 (RFC 822)
    try:
        dt = parsedate_to_datetime(value)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except (TypeError, ValueError):
        pass
    # ISO 8601 (Atom)
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except ValueError:
        return None


def _parse_feed_xml(xml_bytes: bytes, feed: FeedConfig) -> List[PressArticle]:
    """RSS 2.0 ve Atom 1.0 namespace'lerini destekler."""
    try:
        # Bazı feed'ler BOM içerir
        if xml_bytes.startswith(b"\xef\xbb\xbf"):
            xml_bytes = xml_bytes[3:]
        root = ET.fromstring(xml_bytes)
    except ET.ParseError as exc:
        log.warning("press.parse.failed", source=feed.source, error=str(exc))
        return []

    articles: List[PressArticle] = []

    # RSS 2.0 — channel/item
    for item in root.findall(".//item"):
        title = _text_of(item, "title")
        link = _text_of(item, "link")
        description = _text_of(item, "description")
        pub_date = _text_of(item, "pubDate") or _text_of(item, "dc:date", ns_map=NS_MAP)
        image_url = _extract_image_url(item)

        article = _build_article(feed, title, link, description, pub_date, image_url)
        if article:
            articles.append(article)

    # Atom 1.0 — feed/entry
    for entry in root.findall("atom:entry", NS_MAP):
        title = _text_of(entry, "atom:title", ns_map=NS_MAP)
        link_el = entry.find("atom:link[@rel='alternate']", NS_MAP) or entry.find("atom:link", NS_MAP)
        link = link_el.get("href") if link_el is not None else ""
        summary = _text_of(entry, "atom:summary", ns_map=NS_MAP) or _text_of(entry, "atom:content", ns_map=NS_MAP)
        published = _text_of(entry, "atom:published", ns_map=NS_MAP) or _text_of(entry, "atom:updated", ns_map=NS_MAP)

        # Atom: link rel=enclosure veya content içinde img
        image_url = None
        for link_el in entry.findall("atom:link", NS_MAP):
            if link_el.get("rel") == "enclosure" and link_el.get("href"):
                image_url = link_el.get("href")
                break
        if not image_url:
            content_el = entry.find("atom:content", NS_MAP)
            if content_el is not None and content_el.text:
                m = re.search(
                    r'<img[^>]+src=["\']([^"\']+)["\']',
                    content_el.text,
                    re.IGNORECASE,
                )
                if m:
                    image_url = m.group(1)

        article = _build_article(feed, title, link, summary, published, image_url)
        if article:
            articles.append(article)

    return articles


NS_MAP = {
    "atom": "http://www.w3.org/2005/Atom",
    "dc": "http://purl.org/dc/elements/1.1/",
}


def _text_of(parent: ET.Element, tag: str, ns_map: Optional[dict] = None) -> str:
    el = parent.find(tag, ns_map) if ns_map else parent.find(tag)
    if el is None:
        return ""
    return (el.text or "").strip()


def _build_article(
    feed: FeedConfig,
    title: str,
    link: str,
    description: str,
    pub_date: str,
    image_url: Optional[str] = None,
) -> Optional[PressArticle]:
    title = _normalize_text(title)
    summary = _normalize_text(description)
    if not title or not link:
        return None

    haystack = f"{title} {summary}"
    if not KEYWORDS_RE.search(haystack):
        return None

    dt = _parse_pub_date(pub_date) or datetime.now(timezone.utc)
    # ID: link host + path slug (özellikli karakterler dışı). Slug boş kalırsa
    # (path'siz/garip link) hash'e düş ki id sabit "rss-" olmasın ve benzersiz
    # kalsın. (Eski `f"..." or f"..."` hep truthy olduğu için fallback ölüydü.)
    raw_id = re.sub(r"[^A-Za-z0-9]+", "-", link.split("://", 1)[-1])[:80].strip("-")
    article_id = f"rss-{raw_id}" if raw_id else f"rss-{abs(hash(link))}"

    short_summary = summary[:280] + ("…" if len(summary) > 280 else "")

    return PressArticle(
        id=article_id,
        date=dt.date().isoformat(),
        title=title[:200],
        summary=short_summary or title[:200],
        url=link,
        source=feed.source,
        topic=feed.default_topic,
        image_url=image_url,
    )


async def _fetch_feed(client: httpx.AsyncClient, feed: FeedConfig) -> List[PressArticle]:
    try:
        response = await client.get(
            feed.url,
            timeout=HTTP_TIMEOUT,
            headers={
                "User-Agent": "CLIFF/2.0 (+https://notcome.app)",
                "Accept": "application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8",
            },
            follow_redirects=True,
        )
        response.raise_for_status()
    except (httpx.HTTPError, httpx.TimeoutException) as exc:
        log.warning("press.fetch.failed", source=feed.source, error=str(exc))
        return []
    return _parse_feed_xml(response.content, feed)


async def get_articles(days: int = 30, limit: int = 24) -> List[dict]:
    """Tüm Türkçe basın feed'lerini paralel çek, asteroit/uzay filtreliyle birleştir.

    Sonuçlar tarihe göre yeniden eskiye sıralanır; geçmişe doğru `days` günlük
    pencere uygulanır. Tüm feed'ler başarısız olursa boş liste döner —
    frontend manuel listeye geri düşer.
    """
    cache_key = f"turkish-press:days={days}:limit={limit}"

    async def loader() -> List[dict]:
        log.info("press.aggregate.start", feeds=len(FEEDS))
        async with httpx.AsyncClient() as client:
            results = await asyncio.gather(
                *(_fetch_feed(client, f) for f in FEEDS),
                return_exceptions=True,
            )

        articles: List[PressArticle] = []
        for r in results:
            if isinstance(r, list):
                articles.extend(r)

        # Dedupe — aynı URL'i birden fazla feed verebilir
        seen_urls = set()
        unique: List[PressArticle] = []
        for a in articles:
            if a.url in seen_urls:
                continue
            seen_urls.add(a.url)
            unique.append(a)

        # Pencere ve sıralama
        cutoff = datetime.now(timezone.utc).date()
        from datetime import timedelta as _td

        cutoff_min = cutoff - _td(days=days)
        windowed = [a for a in unique if datetime.fromisoformat(a.date).date() >= cutoff_min]
        windowed.sort(key=lambda a: a.date, reverse=True)
        log.info("press.aggregate.done", total=len(windowed))
        return [a.to_dict() for a in windowed[:limit]]

    raw = await cache.get_or_fetch(cache_key, CACHE_TTL_SECONDS, loader)
    return raw if isinstance(raw, list) else []
