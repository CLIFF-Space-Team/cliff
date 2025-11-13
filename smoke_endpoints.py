import os
import sys
import asyncio
import json

sys.path.insert(0, os.path.abspath("backend"))

from app.api.v1.endpoints.horizons import (  # noqa: E402
    get_hybrid_analysis,
    get_ephemeris,
    get_future_positions,
)


async def main() -> None:
    target = "499"  # Mars
    hybrid = await get_hybrid_analysis(target_id=target, days=3, step="1 d")
    ephem = await get_ephemeris(target_id=target, start=None, stop=None, step="1 d", quantities="1,9,20,23,24,29", center=None)
    fut = await get_future_positions(target_id=target, days=3, step="1 d", quantities="2,3,9,20,23,24", center=None)
    out = {
        "hybrid": {
            "success": hybrid.get("success"),
            "ml_label": hybrid.get("ml_risk", {}).get("label"),
            "mc_points": hybrid.get("uncertainty", {}).get("points"),
        },
        "ephemeris_keys": list((ephem or {}).keys())[:5],
        "future_positions_keys": list((fut or {}).keys())[:5],
    }
    print(json.dumps(out))


if __name__ == "__main__":
    asyncio.run(main())

