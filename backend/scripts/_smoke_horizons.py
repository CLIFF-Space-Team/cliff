import asyncio
import json
from datetime import datetime, timedelta

from app.services.nasa_horizons_service import get_nasa_horizons_service


async def main():
    svc = get_nasa_horizons_service()
    try:
        data = await svc.get_future_positions(target_id="499", days_ahead=3)
        # Print a compact summary to stdout
        result = data.get("result", {})
        count = len(result.get("data", []) or data.get("data", []))
        print(json.dumps({
            "ok": True,
            "target": "499",
            "points": count,
            "has_signature": bool(data.get("signature")),
            "source": "NASA/JPL Horizons"
        }))
    finally:
        await svc.aclose()


if __name__ == "__main__":
    asyncio.run(main())

