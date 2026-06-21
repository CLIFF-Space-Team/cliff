"""JPL Horizons (DE441) high-precision ephemeris client.

https://ssd.jpl.nasa.gov/api/horizons.api

Returns parsed observer-mode ephemeris rows: each row has (datetime, ra, dec,
delta_au, deldot_kms, alpha_deg). `get_future_positions` is the convenience
helper used by the hybrid pipeline.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from app.core.config import settings
from app.core.logging import get_logger
from app.nasa import cache, http

log = get_logger(__name__)


@dataclass(frozen=True)
class EphemerisRow:
    when: str
    delta_au: float
    deldot_kms: float
    ra: Optional[str] = None
    dec: Optional[str] = None
    apmag: Optional[float] = None


def _normalize_command(target: str) -> str:
    """Convert NeoWs/SBDB ids to Horizons small-body command format.

    NeoWs returns SPK ids as bare numbers (e.g. "3715499"). Horizons treats
    those as major-body record indexes and rejects them ("IOBJ out of
    bounds"). The correct lookup is `DES=<id>;` which queries the small-body
    designation table — works for both SPK ids (3715499) and IAU numbers
    (99942).
    """
    raw = target.strip()
    if raw.startswith("DES=") or raw.startswith("'"):
        return raw
    if raw.isdigit():
        return f"DES={raw};"
    if raw.endswith(";"):
        return f"DES={raw}"
    return raw


def _default_params(
    target: str,
    start: datetime,
    stop: datetime,
    step: str,
    quantities: str = "1,9,20,23",
) -> Dict[str, str]:
    return {
        "format": "json",
        "COMMAND": f"'{_normalize_command(target)}'",
        "OBJ_DATA": "YES",
        "MAKE_EPHEM": "YES",
        "EPHEM_TYPE": "OBSERVER",
        "CENTER": "'500@399'",  # geocentric Earth
        "START_TIME": start.strftime("'%Y-%m-%d %H:%M'"),
        "STOP_TIME": stop.strftime("'%Y-%m-%d %H:%M'"),
        "STEP_SIZE": f"'{step}'",
        "QUANTITIES": f"'{quantities}'",
        "REF_SYSTEM": "ICRF",
        "TIME_DIGITS": "MINUTES",
        "ANG_FORMAT": "HMS",
        "EXTRA_PREC": "YES",
        "CSV_FORMAT": "YES",
    }


async def get_ephemeris(
    target_id: str,
    start: datetime,
    stop: datetime,
    step: str = "1d",
) -> Dict[str, Any]:
    """Raw Horizons response (JSON) plus `_rows` parsed from the result string."""
    key = f"horizons:{target_id}:{start.isoformat()}:{stop.isoformat()}:{step}"

    async def loader() -> Dict[str, Any]:
        log.info(
            "horizons.fetch",
            target=target_id,
            start=start.isoformat(),
            stop=stop.isoformat(),
            step=step,
        )
        payload = await http.request_json(
            "GET",
            settings.NASA_HORIZONS_URL,
            params=_default_params(target_id, start, stop, step),
            upstream_label="jpl.horizons",
        )
        payload["_rows"] = [row.__dict__ for row in _parse_result(payload)]
        return payload

    return await cache.get_or_fetch(key, settings.CACHE_TTL_HORIZONS, loader)


async def get_future_positions(
    target_id: str,
    days_ahead: int = 30,
    step: str = "1d",
) -> Dict[str, Any]:
    now = datetime.now(timezone.utc).replace(microsecond=0, second=0)
    return await get_ephemeris(
        target_id,
        start=now,
        stop=now + timedelta(days=days_ahead),
        step=step,
    )


def _parse_result(payload: Dict[str, Any]) -> List[EphemerisRow]:
    """Parse the `result` string for `$$SOE` / `$$EOE` table rows.

    Horizons may return CSV or fixed-width depending on flags. We try CSV first
    and fall back to whitespace splitting.
    """
    raw = payload.get("result")
    if not isinstance(raw, str) or "$$SOE" not in raw:
        existing = payload.get("data")
        return existing if isinstance(existing, list) else []

    rows: List[EphemerisRow] = []
    in_table = False
    for line in raw.splitlines():
        stripped = line.strip()
        if stripped == "$$SOE":
            in_table = True
            continue
        if stripped == "$$EOE":
            break
        if not in_table or not stripped:
            continue

        if "," in stripped:
            row = _parse_csv_row(stripped)
        else:
            row = _parse_fixed_row(stripped)
        if row is not None:
            rows.append(row)
    return rows


def _parse_csv_row(line: str) -> Optional[EphemerisRow]:
    """Parse one Horizons CSV row.

    With QUANTITIES="1,9,20,23" the row structure is:
      date, solar_pres, lunar_pres, RA, DEC, apmag, s-brt, delta_au,
      deldot_kms, S-O-T, /L, [trailing empty]

    Indices shift if QUANTITIES change, so we scan from the end:
      *  /L flag at parts[-2]
      *  S-O-T at parts[-3]
      *  deldot at parts[-4]
      *  delta  at parts[-5]
    The last element after `split(",")` is empty (trailing comma).
    """
    parts = [p.strip() for p in line.split(",")]
    # Drop trailing empty token from the trailing comma.
    while parts and parts[-1] == "":
        parts.pop()
    if len(parts) < 6:
        return None
    when = parts[0]
    # Try end-relative parse (works for default QUANTITIES set).
    delta_au: Optional[float] = None
    deldot_kms: Optional[float] = None
    for di, dotsi in (
        (-4, -3),  # /L flag stripped (S-O-T at end after pop): delta=-4, deldot=-3
        (-5, -4),  # /L still at end (rare): delta=-5, deldot=-4
        (-3, -2),  # minimal QUANTITIES="20"
    ):
        try:
            d = float(parts[di])
            v = float(parts[dotsi])
        except (IndexError, ValueError):
            continue
        # Sanity: delta_au should be 0.0001..50, deldot magnitude < 200 km/s
        if 0.0001 <= d <= 50 and abs(v) < 200:
            delta_au = d
            deldot_kms = v
            break
    if delta_au is None or deldot_kms is None:
        return None
    ra = parts[3] if len(parts) > 3 else None
    dec = parts[4] if len(parts) > 4 else None
    apmag: Optional[float] = None
    if len(parts) >= 6:
        try:
            apmag = float(parts[5])
        except ValueError:
            apmag = None
    return EphemerisRow(when=when, delta_au=delta_au, deldot_kms=deldot_kms, ra=ra, dec=dec, apmag=apmag)


def _parse_fixed_row(line: str) -> Optional[EphemerisRow]:
    parts = line.split()
    if len(parts) < 12:
        return None
    try:
        when = f"{parts[0]} {parts[1]}"
        delta_au = float(parts[-5])
        deldot_kms = float(parts[-4])
    except (IndexError, ValueError):
        return None
    return EphemerisRow(when=when, delta_au=delta_au, deldot_kms=deldot_kms)
