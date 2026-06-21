"""Settings — single source of truth for environment-driven config."""

from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

Environment = Literal["development", "staging", "production", "test"]
LogLevel = Literal["debug", "info", "warning", "error", "critical"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # App identity
    APP_NAME: str = "CLIFF Backend"
    APP_VERSION: str = "2.0.0"

    # Environment
    ENVIRONMENT: Environment = "development"
    DEBUG: bool = True

    # Server
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    BACKEND_RELOAD: bool = True

    # Logging
    LOG_LEVEL: LogLevel = "info"

    # NASA
    NASA_API_KEY: str = "DEMO_KEY"
    NASA_BASE_URL: str = "https://api.nasa.gov"
    NASA_NEOWS_URL: str = "https://api.nasa.gov/neo/rest/v1"
    NASA_SSD_BASE_URL: str = "https://ssd-api.jpl.nasa.gov"
    NASA_HORIZONS_URL: str = "https://ssd.jpl.nasa.gov/api/horizons.api"
    NASA_EONET_URL: str = "https://eonet.gsfc.nasa.gov/api/v3"

    # AI provider (OpenAI-compatible — xAI Grok by default)
    AI_BASE_URL: str = "https://api.x.ai"
    AI_API_KEY: Optional[str] = None
    AI_MODEL: str = "grok-4.3"

    # AI rate limits — strict by default since each request burns paid tokens.
    # Per-IP, layered: a request must pass the minute window AND the hour window.
    AI_CHAT_LIMIT_PER_MINUTE: int = 10
    AI_CHAT_LIMIT_PER_HOUR: int = 60
    AI_EXPLAIN_LIMIT_PER_MINUTE: int = 3
    AI_EXPLAIN_LIMIT_PER_HOUR: int = 15
    AI_GLOBAL_LIMIT_PER_MINUTE: int = 60  # safety net across all clients

    # IPs in this list completely bypass every rate limit (per-minute,
    # per-hour, queue, global). Comma-separated. Useful for the operator's
    # own IP + trusted developer machines.
    AI_RATE_LIMIT_BYPASS_RAW: str = Field(default="", alias="AI_RATE_LIMIT_BYPASS_IPS")

    @property
    def AI_RATE_LIMIT_BYPASS_IPS(self) -> List[str]:
        return [ip.strip() for ip in self.AI_RATE_LIMIT_BYPASS_RAW.split(",") if ip.strip()]

    # Admin panel — IPs that get auto-admin (no token needed). Same CSV
    # convention as the AI bypass list. Default: operator's home IP.
    ADMIN_IP_WHITELIST_RAW: str = Field(default="94.121.86.35", alias="ADMIN_IP_WHITELIST")
    # Optional Bearer token. When set, callers from non-whitelisted IPs can
    # still authenticate by sending `Authorization: Bearer <token>`. When
    # left empty, IP-based auth is the only path.
    ADMIN_TOKEN: Optional[str] = None

    @property
    def ADMIN_IP_WHITELIST(self) -> List[str]:
        return [ip.strip() for ip in self.ADMIN_IP_WHITELIST_RAW.split(",") if ip.strip()]

    # External hazard data sources
    FIRMS_API_KEY: str = Field(default="")

    # Text-to-speech upstream — endpoint + credentials live in env, never in source.
    # The endpoint speaks an asynchronous submit/poll protocol over HTTPS;
    # voice catalog and model id are configurable so operators can swap models
    # without code changes.
    TTS_API_KEY: Optional[str] = None
    TTS_BASE_URL: str = ""
    TTS_MODEL: str = "elevenlabs-multilingual-v2"
    TTS_DEFAULT_VOICE_ID: str = "Xb7hH8MSUJpSbSDYk0k2"
    TTS_TIMEOUT_SECONDS: float = 60.0
    TTS_POLL_INTERVAL_SECONDS: float = 1.5
    TTS_MAX_POLL_ATTEMPTS: int = 60
    TTS_LIMIT_PER_MINUTE: int = 10
    TTS_LIMIT_PER_HOUR: int = 60

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_TIMEOUT_SECONDS: int = 5
    # Dev convenience: if the real Redis is unreachable at startup, fall back to
    # an in-memory fakeredis so the backend still runs locally without Docker.
    # Never auto-fakes in production (data there must be real, shared, durable).
    REDIS_FALLBACK_FAKE: bool = True

    # CORS — comma-separated raw value, parsed via property below.
    # (We keep this as `str` so pydantic-settings doesn't try to JSON-decode it.)
    CORS_ORIGINS_RAW: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3000",
        alias="CORS_ORIGINS",
    )

    @property
    def CORS_ORIGINS(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS_RAW.split(",") if origin.strip()]

    # Autonomous scheduler
    INGEST_INTERVAL_SECONDS: int = 1800
    RISK_REFRESH_SECONDS: int = 3600
    WATCHLIST_SIZE: int = 200
    INGEST_FEED_DAYS_BOOT: int = 30  # initial cycle pulls 30 days for a wider catalog
    INGEST_FEED_DAYS_CYCLE: int = 7  # subsequent cycles pull 7 days (NeoWs limit)
    SCHEDULER_ENABLED: bool = True

    # Earth-events ingest (EONET + AFAD).
    SCHEDULER_EARTH_ENABLED: bool = True
    EARTH_INGEST_INTERVAL_SECONDS: int = 600  # every 10 min
    EARTH_REFRESH_DAYS: int = 30  # how far back EONET fetches each cycle
    EARTH_AFAD_WINDOW_HOURS: int = 72  # AFAD lookback per cycle

    # NASA HTTP layer
    NASA_HTTP_TIMEOUT_SECONDS: float = 30.0
    NASA_RATE_LIMIT_RPS: float = 1.5

    # Cache TTLs (seconds)
    CACHE_TTL_NEOWS: int = 300
    CACHE_TTL_SENTRY: int = 600
    CACHE_TTL_HORIZONS: int = 3600
    CACHE_TTL_EONET: int = 600

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def is_testing(self) -> bool:
        return self.ENVIRONMENT == "test"

    @property
    def docs_enabled(self) -> bool:
        return self.is_development


settings = Settings()


def get_settings() -> Settings:
    return settings
