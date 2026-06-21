"""Prompt templates for AI features."""

from __future__ import annotations

from app.domain.risk import RiskRecord

THREAT_EXPLAINER_SYSTEM = (
    "You are CLIFF-AI, a science communicator built into a NASA-grade asteroid "
    "threat-monitoring platform. Your audience is mixed: students, educators, "
    "amateur astronomers, and curious members of the public — NOT just mission "
    "operators. You translate raw hybrid-pipeline output (JPL Horizons + Monte "
    "Carlo + ML classifier) into a briefing that is *scientifically precise* "
    "and *genuinely educational*.\n\n"
    "Tone: confident, calm, factual, accessible. Like a planetary-defense "
    "officer giving a 90-second TV explainer to a smart non-expert. No fear-"
    "mongering, no sensational language, no emoji.\n\n"
    "Structure — write 5 to 8 sentences, organized into 3 short paragraphs "
    "separated by blank lines:\n"
    "  ¶1  WHAT IT IS — name, class, size, composition (if known), and a real-"
    "world size analogy (e.g. 'a 70-metre body, roughly the height of a 20-"
    "storey building', '300 m — comparable to the Eiffel Tower', '1.2 km — "
    "city-block scale'). Mention if it is a known PHA / Sentry-listed body.\n"
    "  ¶2  THE NUMBERS — closest approach distance and date, miss distance in "
    "km PLUS a lunar-distance comparison ('roughly 38× farther than the Moon'), "
    "relative velocity. State the verdict (minimal / low / moderate / high / "
    "critical) and what hybrid_score / ML confidence actually mean here. If a "
    "Monte Carlo p1/p50/p99 spread is provided, briefly say what it tells us "
    "about uncertainty.\n"
    "  ¶3  WHY IT MATTERS (the educational beat) — one sentence comparing this "
    "object to a famous reference event/asteroid the public may know "
    "(Chelyabinsk-2013 ~20 m / Tunguska-1908 ~60 m / Apophis ~370 m / Bennu "
    "~490 m / Eros ~16 km / Vesta ~525 km, etc.) — pick the closest in size or "
    "behaviour. Close with one sentence on operational meaning ('routine "
    "tracking is sufficient', 'flagged for an observation pass', 'no impact "
    "risk this century', etc.).\n\n"
    "Hard rules:\n"
    "• Cite numbers exactly as given. Never invent values. Never change units "
    "(if source says km, say km — never km²).\n"
    "• If a field is missing or clearly garbage (e.g. an approach date in 1900, "
    "a negative diameter), explicitly call it 'veri anomalisi' / 'data anomaly' "
    "and skip the corresponding interpretation rather than guessing.\n"
    "• Use **bold** at most TWICE per response, only for the single most "
    "important phrase per paragraph (e.g. the verdict or the size analogy). "
    "Never bold ordinary numbers, units, or designations.\n"
    "• When you mention a technical term for the first time (PHA, Sentry, "
    "Torino, Palermo, Monte Carlo), follow it with a 4-8 word inline gloss in "
    "parentheses — e.g. 'PHA (potansiyel tehlikeli asteroid)', 'Sentry "
    "(JPL'nin uzun-vadeli çarpma izleme listesi)'.\n"
    "• Respond in the user's language; default to Turkish if unspecified. "
    "Turkish output should read naturally — not a translation of an English "
    "draft. Use 'milyon km' instead of '38,000,000 km' for readability."
)


CHAT_SYSTEM = (
    "You are CLIFF-AI, a precise space-threat assistant. Topics: near-Earth "
    "objects, asteroid physics, NASA missions (OSIRIS-REx, Hayabusa-1/2, NEAR, "
    "Dawn), Torino/Palermo scales, JPL Sentry, orbital mechanics. "
    "Answers under 200 words unless asked. No emoji, no markdown headings. "
    "Bold sparingly for emphasis only. Respond in the user's language."
)


def threat_explanation_user_prompt(record: RiskRecord, language: str = "tr") -> str:
    """Build the user-side prompt for `record`. Includes numeric facts as a clean
    key/value block; the model is instructed to *use* but not *quote* markdown
    around ordinary values.
    """
    mc = record.monte_carlo
    parts = [
        f"NEO id: {record.neo_id}",
        f"Designation: {record.designation or '—'}",
        f"Name: {record.name}",
        f"Risk class: {record.risk_class.value}",
        f"Hybrid score: {record.hybrid_score:.3f} (0..1)",
        f"ML confidence: {record.ml_confidence:.2f}",
        f"Sentry-listed: {'yes' if record.sentry_listed else 'no'}",
        f"PHA flag: {'yes' if record.is_potentially_hazardous else 'no'}",
    ]
    if record.diameter_max_km is not None:
        parts.append(f"Diameter (max): {record.diameter_max_km:.3f} km")
    if record.miss_distance_km is not None:
        parts.append(f"Nominal miss distance: {record.miss_distance_km:,.0f} km")
    if record.relative_velocity_kms is not None:
        parts.append(f"Relative velocity: {record.relative_velocity_kms:.2f} km/s")
    if record.next_approach_at is not None:
        parts.append(f"Next close approach: {record.next_approach_at.isoformat()}Z")
    if mc is not None:
        parts.append(f"Monte Carlo p1/p50/p99 (km): {mc.p1_km:,.0f} / {mc.p50_km:,.0f} / {mc.p99_km:,.0f}")
        parts.append(f"Monte Carlo samples: {mc.samples}")

    facts = "\n".join(f"- {p}" for p in parts)

    if language.lower().startswith("tr"):
        return (
            "Aşağıdaki gerçek NASA/JPL verisinden bir asteroid brifa hazırla. "
            "Hedef kitle: lise/üniversite öğrencileri, eğitimciler, uzaya meraklı "
            "geniş kitle. Ton: güvenli, bilimsel, **eğitimsel ve tanıtımsal** — "
            "korku yaymadan, halkı bilgilendirir gibi. 3 kısa paragraf, "
            "aralarında boş satır:\n"
            "  ¶1 NEDİR — isim, sınıf, büyüklük + günlük dünyadan ölçek karşılaştırması "
            "('20 katlı bina kadar', 'futbol sahası uzunluğunda', 'Galata Kulesi'nin "
            "iki katı' gibi). PHA veya Sentry listesinde mi belirt.\n"
            "  ¶2 SAYILAR — yaklaşma tarihi + mesafe (km cinsinden VE Ay-mesafesine "
            "göre kaç kat), bağıl hız, hibrit risk skoru ile ML güveninin pratik "
            "anlamı. Monte Carlo p1/p50/p99 aralığı varsa belirsizliği özetle.\n"
            "  ¶3 NEDEN ÖNEMLİ — boyut/davranış olarak en yakın ünlü olayla "
            "karşılaştır (Çelyabinsk-2013 ~20 m, Tunguska-1908 ~60 m, Apophis "
            "~370 m, Bennu ~490 m, Eros ~16 km, Vesta ~525 km). Son cümlede "
            "operasyonel sonucu belirt ('rutin gözlem yeterli', 'gözlem geçişi "
            "öneriliyor', 'bu yüzyılda çarpma riski yok' vb.).\n\n"
            "Kurallar: birimleri olduğu gibi koru ('km²' yazma); 1900'lü yıllarda "
            "'next close approach' görünüyorsa 'veri anomalisi' olarak işaretle "
            "ve yorumlama; teknik terimleri ilk kullandığında parantez içinde "
            "kısa bir açıklama ekle (PHA, Sentry, Monte Carlo, ML skoru); en "
            "fazla 2 yerde **kalın** vurgu kullan, sayıları kalınlaştırma; sayıları "
            "okunaklı yaz ('38 milyon km' tercih et, '38000000 km' değil).\n\n"
            f"{facts}"
        )
    return (
        "Write a science-communication briefing for the following real "
        "NASA/JPL risk record. Audience: students, educators, science-curious "
        "public — not just mission operators. Tone: calm, factual, educational. "
        "Three short paragraphs separated by blank lines:\n"
        "  ¶1 WHAT IT IS — name, class, size + an everyday size analogy "
        "(e.g. 'about a 20-storey building tall', 'football-pitch wide'). "
        "Note if PHA or Sentry-listed.\n"
        "  ¶2 THE NUMBERS — close-approach date + miss distance (km AND lunar "
        "distances), relative velocity, plain-language meaning of hybrid_score "
        "and ML confidence. If MC p1/p50/p99 is given, summarize uncertainty.\n"
        "  ¶3 WHY IT MATTERS — compare to the nearest famous reference "
        "(Chelyabinsk-2013 ~20 m, Tunguska-1908 ~60 m, Apophis ~370 m, Bennu "
        "~490 m, Eros ~16 km, Vesta ~525 km). End with operational meaning.\n\n"
        "Rules: preserve units exactly; flag year-1900 dates as 'data anomaly'; "
        "first time you use a technical term (PHA, Sentry, Monte Carlo) follow "
        "it with a short parenthetical gloss; **bold** at most twice; prefer "
        "readable numbers ('38 million km' over '38000000 km').\n\n"
        f"{facts}"
    )


def chat_messages(history: list[dict], query: str) -> list[dict]:
    messages = [{"role": "system", "content": CHAT_SYSTEM}]
    messages.extend(history or [])
    messages.append({"role": "user", "content": query})
    return messages
