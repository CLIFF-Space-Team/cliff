"""ISS (International Space Station) endpoints."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Query

from app.sources import iss as iss_source

router = APIRouter()


@router.get("/passes-tr")
async def passes_tr(limit: int = Query(8, ge=1, le=20)) -> Dict[str, Any]:
    """Türkiye semasından önümüzdeki ISS geçişleri.

    NASA Spot the Station resmi RSS feed'lerinden 5 ana şehrin (İstanbul, Ankara,
    İzmir, Bursa, Antalya) gözlem zamanları. Her geçiş için başlangıç saati,
    süre, maksimum yükseklik (°), doğuş/batış yönü.
    """
    items = await iss_source.get_passes(limit=limit)
    return {
        "items": items,
        "total": len(items),
        "source": "spotthestation.nasa.gov",
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }
