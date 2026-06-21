"""Application exception hierarchy + FastAPI handlers."""

from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import get_logger

log = get_logger(__name__)


class ApiError(Exception):
    """Base for all expected, user-facing errors.

    `status_code` maps to HTTP status. `code` is a machine-readable token (e.g.
    'NASA_RATE_LIMIT', 'NEO_NOT_FOUND'). `details` is optional structured data.
    """

    status_code: int = 500
    code: str = "INTERNAL_ERROR"

    def __init__(
        self,
        message: str,
        *,
        status_code: Optional[int] = None,
        code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        if status_code is not None:
            self.status_code = status_code
        if code is not None:
            self.code = code
        self.details = details or {}

    def to_payload(self) -> Dict[str, Any]:
        body: Dict[str, Any] = {
            "error": True,
            "code": self.code,
            "message": self.message,
        }
        if self.details:
            body["details"] = self.details
        return body


class NotFoundError(ApiError):
    status_code = 404
    code = "NOT_FOUND"


class ValidationError(ApiError):
    status_code = 422
    code = "VALIDATION_ERROR"


class UpstreamError(ApiError):
    """NASA / external API failure."""

    status_code = 502
    code = "UPSTREAM_ERROR"


class RateLimitError(ApiError):
    status_code = 429
    code = "RATE_LIMITED"


class ServiceUnavailableError(ApiError):
    status_code = 503
    code = "SERVICE_UNAVAILABLE"


def register_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def _api_error_handler(request: Request, exc: ApiError) -> JSONResponse:
        # 4xx errors are routine signalling (cache miss → 404, bad input →
        # 422). Only 5xx upstream/internal failures deserve a WARNING.
        log_fn = log.warning if exc.status_code >= 500 else log.info
        log_fn(
            "api_error",
            path=request.url.path,
            method=request.method,
            code=exc.code,
            status=exc.status_code,
            message=exc.message,
        )
        return JSONResponse(status_code=exc.status_code, content=exc.to_payload())

    @app.exception_handler(StarletteHTTPException)
    async def _http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": True,
                "code": f"HTTP_{exc.status_code}",
                "message": exc.detail,
            },
        )

    @app.exception_handler(RequestValidationError)
    async def _validation_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={
                "error": True,
                "code": "VALIDATION_ERROR",
                "message": "Request validation failed",
                "details": {"errors": exc.errors()},
            },
        )

    @app.exception_handler(Exception)
    async def _unhandled_handler(request: Request, exc: Exception) -> JSONResponse:
        log.exception(
            "unhandled_exception",
            path=request.url.path,
            method=request.method,
            error_type=type(exc).__name__,
        )
        return JSONResponse(
            status_code=500,
            content={
                "error": True,
                "code": "INTERNAL_ERROR",
                "message": "Internal server error",
            },
        )
