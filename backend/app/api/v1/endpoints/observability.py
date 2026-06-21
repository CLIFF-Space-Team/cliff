"""Türkiye semasından gözlemlenebilir NEO'lar.

Risk store'daki yakın-geçiş yapacak NEO'ları parlaklık tahmini ile filtreler:

  H ≈ 5·log10(1329/√albedo) - 5·log10(D_km)        (albedo=0.15 varsayım)
  m_apparent ≈ H + 5·log10(distance_AU)             (kabaca)

m ≤ 6 = çıplak gözle, m ≤ 12 = amatör teleskop, m ≤ 18 = profesyonel.

Yaklaşmadan önceki birkaç gün boyunca gece görünür. Tam horizon hesabı
yerine "yaklaşım sırasında nominal olarak görülebilir mi" kabaca filtre.
"""

from __future__ import annotations

import math
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional  # noqa: F401

from fastapi import APIRouter, Query

from app.pipeline import risk_store

router = APIRouter()

KM_PER_AU = 149_597_870.7
DEFAULT_ALBEDO = 0.15  # S-tipi tipik
NAKED_EYE_LIMIT = 6.0
AMATEUR_TELESCOPE_LIMIT = 12.0
PROFESSIONAL_LIMIT = 18.0


def _h_from_diameter(diameter_km: float, albedo: float = DEFAULT_ALBEDO) -> float:
    """Mutlak parlaklık (H) — Bowell (1989) bağıntısı."""
    if diameter_km <= 0:
        return 99.0
    return 5.0 * math.log10(1329.0 / math.sqrt(albedo)) - 5.0 * math.log10(diameter_km)


def _apparent_magnitude(h: float, distance_au: float) -> float:
    """Yaklaşık görünen parlaklık. r ≈ 1 AU varsayımıyla basitleştirilmiş."""
    if distance_au <= 0:
        return 99.0
    # Daha gerçekçi formül için faz açısı eklenir; demo için Δ baskın.
    return h + 5.0 * math.log10(distance_au)


def _observable_window(approach_at: datetime, lat: float = 39.0) -> str:
    """Türkiye gecesi varsayımı: yerel saat 21:00–05:00 arası gözlem."""
    # Türkiye TRT (UTC+3)
    trt = approach_at.astimezone(timezone(timedelta(hours=3)))
    hour = trt.hour
    if 21 <= hour or hour < 5:
        return "gece (uygun)"
    if 5 <= hour < 8 or 18 <= hour < 21:
        return "alacakaranlık"
    return "gündüz (uygun değil)"


def _phase_angle_estimate(distance_au: float) -> float:
    """Faz açısı yaklaşımı (derece).

    Yakın geçiş sırasında NEO observer-Sun çizgisinde olabilir; faz açısı
    küçük (~0-30°) → tam aydınlatılmış. Çok uzak NEO'lar büyük faz açısı
    (~90-180°) → yarım/hilal görünür.

    Δ ≪ 1 AU varsayımıyla observer ≈ Earth, ve NEO ≈ Earth-Sun düzlemi
    yakınında. Pragmatik tahmin: dist ile artan açı.
    """
    # Δ < 0.001 AU → yakın geçiş, ~30° faz açısı
    # Δ > 0.05 AU → ~90° faz açısı
    if distance_au < 0.001:
        return 30.0
    if distance_au > 0.1:
        return 110.0
    # Logaritmik interpolasyon
    log_d = math.log10(distance_au)
    return min(120.0, max(20.0, 30.0 + (log_d + 3) * 30.0))


def _observable_time_tr(approach_at: datetime) -> str:
    """Türkiye saati ile 'bu gece HH:MM-HH:MM' aralık tahmini."""
    trt = approach_at.astimezone(timezone(timedelta(hours=3)))
    hour = trt.hour
    if 21 <= hour or hour < 5:
        return f"{trt.strftime('%d %b')} · {trt.strftime('%H:%M')} TRT"
    return f"{trt.strftime('%d %b %H:%M')} TRT (gündüz)"


def _classify(magnitude: float) -> str:
    if magnitude <= NAKED_EYE_LIMIT:
        return "naked_eye"
    if magnitude <= AMATEUR_TELESCOPE_LIMIT:
        return "amateur_telescope"
    if magnitude <= PROFESSIONAL_LIMIT:
        return "professional"
    return "out_of_reach"


@router.get("/turkey")
async def turkey_observable(
    days: int = Query(14, ge=1, le=60),
    max_magnitude: float = Query(18.0, ge=0.0, le=24.0),
) -> Dict[str, Any]:
    """Türkiye semasından önümüzdeki `days` gün içinde gözlemlenebilir NEO'lar.

    Risk store'dan top-200 NEO alınır, yaklaşmaları analiz edilir, parlaklık
    eşiği üstündekiler döner. m ≤ 12 sonuçlar amatörün ulaşabileceği teleskopla
    görülür; m ≤ 6 olanlar çıplak gözle.
    """
    records = await risk_store.top_n_by_score(200)
    now = datetime.now(timezone.utc)
    horizon = now + timedelta(days=days)

    out: List[Dict[str, Any]] = []
    for r in records:
        approach = r.next_approach_at
        if approach is None:
            continue
        # risk_store naive datetime depoluyor — UTC kabul et
        if approach.tzinfo is None:
            approach = approach.replace(tzinfo=timezone.utc)
        if approach < now or approach > horizon:
            continue
        if r.miss_distance_km is None or r.miss_distance_km <= 0:
            continue
        if r.diameter_max_km is None or r.diameter_max_km <= 0:
            continue

        distance_au = r.miss_distance_km / KM_PER_AU
        h = _h_from_diameter(r.diameter_max_km)
        m = _apparent_magnitude(h, distance_au)
        if m > max_magnitude:
            continue

        days_until: Optional[int] = None
        delta = approach - now
        days_until = max(0, delta.days)

        phase_angle = _phase_angle_estimate(distance_au)
        out.append(
            {
                "neo_id": r.neo_id,
                "name": r.name,
                "designation": r.designation,
                "diameter_max_km": r.diameter_max_km,
                "miss_distance_km": r.miss_distance_km,
                "miss_distance_au": round(distance_au, 5),
                "next_approach_at": approach.isoformat(),
                "days_until_approach": days_until,
                "absolute_magnitude_h": round(h, 2),
                "apparent_magnitude": round(m, 2),
                "phase_angle_deg": round(phase_angle, 1),
                "observable_class": _classify(m),
                "observable_window": _observable_window(approach),
                "best_time_tr": _observable_time_tr(approach),
                "is_potentially_hazardous": r.is_potentially_hazardous,
                "sentry_listed": r.sentry_listed,
                "hybrid_score": r.hybrid_score,
                "risk_class": r.risk_class.value,
            }
        )

    # En parlak (en düşük m) önce
    out.sort(key=lambda x: x.get("apparent_magnitude") or 99)

    return {
        "items": out,
        "total": len(out),
        "days": days,
        "max_magnitude": max_magnitude,
        "naked_eye_limit": NAKED_EYE_LIMIT,
        "amateur_telescope_limit": AMATEUR_TELESCOPE_LIMIT,
        "professional_limit": PROFESSIONAL_LIMIT,
        "observer_lat": 39.0,
        "observer_lng": 35.0,
        "fetched_at": now.isoformat(),
    }
