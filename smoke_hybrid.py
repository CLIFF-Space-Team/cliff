import sys
import os
import asyncio
import json

sys.path.insert(0, os.path.abspath("backend"))

from app.services.hybrid_orbital_engine import analyze_target  # noqa: E402


async def main():
    result = await analyze_target("499", days_ahead=3, step="1 d")
    # Compact summary
    out = {
        "success": result.get("success"),
        "ml_label": result.get("ml_risk", {}).get("label"),
        "ml_conf": result.get("ml_risk", {}).get("confidence"),
        "mc_points": result.get("uncertainty", {}).get("points"),
    }
    print(json.dumps(out))


if __name__ == "__main__":
    asyncio.run(main())

