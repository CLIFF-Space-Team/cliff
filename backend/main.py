"""CLIFF backend entry point.

Phase 0 scaffold: minimal FastAPI app with /health. Phase 1 wires this up to
the full app factory in app.main (config, logging, Redis, lifespan, routers).
"""

from __future__ import annotations

import sys

import uvicorn

if sys.platform == "win32":
    import codecs
    import logging

    class _SafeStreamHandler(logging.StreamHandler):
        def emit(self, record: logging.LogRecord) -> None:
            try:
                super().emit(record)
            except (ValueError, OSError, AttributeError):
                pass

    root_logger = logging.getLogger()
    for handler in root_logger.handlers[:]:
        if isinstance(handler, logging.StreamHandler):
            root_logger.removeHandler(handler)
    safe = _SafeStreamHandler()
    safe.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s"))
    root_logger.addHandler(safe)

    try:
        if hasattr(sys.stdout, "buffer") and not getattr(sys.stdout, "_detached", False):
            sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())
            sys.stdout._detached = True  # type: ignore[attr-defined]
        if hasattr(sys.stderr, "buffer") and not getattr(sys.stderr, "_detached", False):
            sys.stderr = codecs.getwriter("utf-8")(sys.stderr.detach())
            sys.stderr._detached = True  # type: ignore[attr-defined]
    except (AttributeError, OSError, ValueError, RuntimeError):
        pass


from app.main import create_app  # noqa: E402

app = create_app()


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
