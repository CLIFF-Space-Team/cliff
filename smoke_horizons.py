import sys
import os
import asyncio
import json

# Ensure backend package is importable
sys.path.insert(0, os.path.abspath("backend"))

from app.services.nasa_horizons_service import get_nasa_horizons_service  # noqa: E402


async def main():
    svc = get_nasa_horizons_service()
    try:
        data = await svc.get_future_positions(target_id="499", days_ahead=2)
        raw = data.get("result") or ""
        points = 0
        if isinstance(raw, str):
            in_table = False
            for line in raw.splitlines():
                s = line.strip()
                if s == "$$SOE":
                    in_table = True
                    continue
                if s == "$$EOE":
                    break
                if in_table and s:
                    points += 1
        print(json.dumps({"ok": True, "points": points, "has_result": isinstance(raw, str)}))
    finally:
        await svc.aclose()


if __name__ == "__main__":
    asyncio.run(main())

