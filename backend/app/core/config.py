import os
from typing import List, Optional, Union
from pydantic_settings import BaseSettings
from pydantic import validator, Field
import secrets


class Settings(BaseSettings):
    APP_NAME: str = "CLIFF - Cosmic Level Intelligent Forecast Framework"
    APP_VERSION: str = "1.0.0"
    APP_DESCRIPTION: str = "AI-powered space and Earth threat monitoring platform"
    
    ENVIRONMENT: str = Field(default="development", env="NODE_ENV")
    DEBUG: bool = Field(default=True)
    
    BACKEND_HOST: str = Field(default="0.0.0.0")
    BACKEND_PORT: int = Field(default=8000)
    BACKEND_RELOAD: bool = Field(default=True)
    BACKEND_LOG_LEVEL: str = Field(default="info")
    
    FRONTEND_URL: str = Field(default="https://nasa.kynux.dev")
    
    NASA_API_KEY: str = Field(default="DEMO_KEY")
    NASA_BASE_URL: str = Field(default="https://api.nasa.gov")
    
    NASA_NEOWS_URL: str = Field(default="https://api.nasa.gov/neo/rest/v1")
    NASA_EONET_URL: str = Field(default="https://eonet.gsfc.nasa.gov/api/v3")
    NASA_DONKI_URL: str = Field(default="https://api.nasa.gov/DONKI")
    NASA_EPIC_URL: str = Field(default="https://api.nasa.gov/EPIC/api")
    NASA_GIS_URL: str = Field(default="https://gibs.earthdata.nasa.gov/wmts/epsg4326/best")
    NASA_EXOPLANET_URL: str = Field(default="https://exoplanetarchive.ipac.caltech.edu/TAP/sync")
    NASA_SSD_URL: str = Field(default="https://ssd-api.jpl.nasa.gov/cad.api")
    
    AI_BASE_URL: str = Field(default="https://xxx.kynux.dev")
    AI_API_KEY: Optional[str] = Field(default=None)
    AI_MODEL: str = Field(default="meta/llama-4-maverick-instruct")
    
    GOOGLE_API_KEY: Optional[str] = Field(default=None)
    GEMINI_API_KEY: Optional[str] = Field(default=None)
    CORTEX_IMAGE_API_KEY: Optional[str] = Field(default=None)
    
    MONGODB_URL: str = Field(default="mongodb+srv://..:..@cluster0.af5h8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
    MONGODB_HOST: str = Field(default="localhost")
    MONGODB_PORT: int = Field(default=27017)
    MONGODB_NAME: str = Field(default="cliff_db")
    MONGODB_USER: str = Field(default="cliff_user")
    MONGODB_PASSWORD: str = Field(default="cliff_pass_2025")
    
    REDIS_URL: str = Field(default="redis://localhost:6379/0")
    REDIS_HOST: str = Field(default="localhost")
    REDIS_PORT: int = Field(default=6379)
    REDIS_PASSWORD: Optional[str] = Field(default="cliff_redis_2025")
    
    ELASTICSEARCH_URL: str = Field(default="http://localhost:9200")
    ELASTICSEARCH_HOST: str = Field(default="localhost")
    ELASTICSEARCH_PORT: int = Field(default=9200)
    
    JWT_SECRET: str = Field(default_factory=lambda: secrets.token_urlsafe(32))
    JWT_ALGORITHM: str = Field(default="HS256")
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30)
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7)
    
    API_SECRET_KEY: str = Field(default_factory=lambda: secrets.token_urlsafe(32))
    API_RATE_LIMIT_PER_MINUTE: int = Field(default=100)
    
    SESSION_SECRET: str = Field(default_factory=lambda: secrets.token_urlsafe(32))
    COOKIE_SECRET: str = Field(default_factory=lambda: secrets.token_urlsafe(32))
    
    CORS_ORIGINS: List[str] = Field(
        default=[
            "https://nasa.kynux.dev",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3001"
        ]
    )
    
    @validator("CORS_ORIGINS", pre=True)
    def parse_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v
    
    ALLOWED_HOSTS: List[str] = Field(
        default=["localhost", "127.0.0.1", "nasa.kynux.dev", "cliff-app.com"]
    )
    
    WORKER_PROCESSES: int = Field(default=4)
    WORKER_CONNECTIONS: int = Field(default=1000)
    WORKER_TIMEOUT: int = Field(default=30)
    
    CACHE_TTL_SECONDS: int = Field(default=300)
    CACHE_MAX_SIZE_MB: int = Field(default=1024)
    
    RATE_LIMIT_REQUESTS_PER_MINUTE: int = Field(default=60)
    RATE_LIMIT_BURST_SIZE: int = Field(default=10)
    
    ENABLE_SCHEDULER: bool = Field(default=True)
    THREAT_REFRESH_SECONDS: int = Field(default=1800)
    
    CDN_BASE_URL: str = Field(default="https://cdn.cliff-app.com")
    STATIC_FILES_URL: str = Field(default="http://localhost:8000/static")
    
    GRAFANA_URL: str = Field(default="http://localhost:3001")
    PROMETHEUS_URL: str = Field(default="http://localhost:9090")
    ELASTICSEARCH_LOGS_INDEX: str = Field(default="cliff-logs")
    
    EMAIL_SERVICE_ENABLED: bool = Field(default=False)
    EMAIL_SMTP_HOST: str = Field(default="smtp.gmail.com")
    EMAIL_SMTP_PORT: int = Field(default=587)
    EMAIL_SMTP_USER: Optional[str] = Field(default=None)
    EMAIL_SMTP_PASSWORD: Optional[str] = Field(default=None)
    
    PUSH_NOTIFICATIONS_ENABLED: bool = Field(default=True)
    FIREBASE_SERVER_KEY: Optional[str] = Field(default=None)
    VAPID_PUBLIC_KEY: Optional[str] = Field(default=None)
    VAPID_PRIVATE_KEY: Optional[str] = Field(default=None)
    
    ENABLE_VOICE_INTERFACE: bool = Field(default=True)
    ENABLE_3D_VISUALIZATION: bool = Field(default=True)
    ENABLE_CUSTOM_AI: bool = Field(default=True)
    ENABLE_SCREEN_ANALYSIS: bool = Field(default=True)
    
    ENABLE_ASTEROID_MONITORING: bool = Field(default=True)
    ENABLE_EARTH_MONITORING: bool = Field(default=True)
    ENABLE_SPACE_WEATHER: bool = Field(default=True)
    ENABLE_EXOPLANET_DISCOVERY: bool = Field(default=True)
    
    ENABLE_MOBILE_APP: bool = Field(default=True)
    ENABLE_DESKTOP_APP: bool = Field(default=True)
    ENABLE_VR_INTERFACE: bool = Field(default=True)
    ENABLE_VOICE_COMMANDS: bool = Field(default=True)
    
    ENABLE_WEBSOCKETS: bool = Field(default=True)
    ENABLE_PUSH_NOTIFICATIONS: bool = Field(default=True)
    ENABLE_REAL_TIME_ALERTS: bool = Field(default=True)
    
    VERBOSE_LOGGING: bool = Field(default=True)
    SQL_ECHO: bool = Field(default=False)
    
    FAST_RELOAD: bool = Field(default=True)
    AUTO_RESTART: bool = Field(default=True)
    
    TEST_DATABASE_URL: str = Field(default="mongodb://cliff_user:cliff_pass_2025@localhost:27017/cliff_test?authSource=admin")
    TEST_REDIS_URL: str = Field(default="redis://localhost:6380/0")
    
    @validator("ENVIRONMENT")
    def validate_environment(cls, v: str) -> str:
        allowed_environments = ["development", "staging", "production", "test"]
        if v.lower() not in allowed_environments:
            raise ValueError(f"Environment must be one of: {allowed_environments}")
        return v.lower()
    
    @validator("BACKEND_LOG_LEVEL")
    def validate_log_level(cls, v: str) -> str:
        allowed_levels = ["debug", "info", "warning", "error", "critical"]
        if v.lower() not in allowed_levels:
            raise ValueError(f"Log level must be one of: {allowed_levels}")
        return v.lower()
    
    @validator("JWT_ALGORITHM")
    def validate_jwt_algorithm(cls, v: str) -> str:
        allowed_algorithms = ["HS256", "HS384", "HS512", "RS256", "RS384", "RS512"]
        if v not in allowed_algorithms:
            raise ValueError(f"JWT algorithm must be one of: {allowed_algorithms}")
        return v
    
    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"
    
    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"
    
    @property
    def is_testing(self) -> bool:
        return self.ENVIRONMENT == "test"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"
        
        env_prefix = ""
        
        json_schema_extra = {
            "example": {
                "APP_NAME": "CLIFF - Cosmic Level Intelligent Forecast Framework",
                "ENVIRONMENT": "development",
                "DEBUG": True,
                "BACKEND_PORT": 8000,
                "NASA_API_KEY": "your_nasa_api_key",
                "MONGODB_URL": "mongodb://cliff_user:cliff_pass_2025@localhost:27017/cliff_db?authSource=admin"
            }
        }


settings = Settings()


def get_settings() -> Settings:
    return settings


def validate_settings() -> bool:
    try:
        if settings.is_production:
            if settings.NASA_API_KEY == "DEMO_KEY":
                raise ValueError("NASA_API_KEY must be set in production")
        
        if not settings.MONGODB_URL:
            raise ValueError("MONGODB_URL must be set")
        
        if not settings.REDIS_URL:
            raise ValueError("REDIS_URL must be set")
        
        if len(settings.JWT_SECRET) < 32:
            raise ValueError("JWT_SECRET must be at least 32 characters long")
        
        return True
        
    except Exception as e:
        print(f"Settings validation failed: {str(e)}")
        raise


def print_settings_summary():
    if settings.DEBUG:
        print("CLIFF Backend Settings Summary:")
        print(f"   Environment: {settings.ENVIRONMENT}")
        print(f"   Backend Port: {settings.BACKEND_PORT}")
        print(f"   Database: {settings.MONGODB_HOST}:{settings.MONGODB_PORT}")
        print(f"   Redis: {settings.REDIS_HOST}:{settings.REDIS_PORT}")
        print(f"   NASA API: {'Configured' if settings.NASA_API_KEY != 'DEMO_KEY' else 'DEMO_KEY'}")
        print(f"   Custom AI: {'Enabled' if settings.ENABLE_CUSTOM_AI else 'Disabled'}")
        print(f"   Voice Interface: {'Enabled' if settings.ENABLE_VOICE_INTERFACE else 'Disabled'}")
        print(f"   WebSockets: {'Enabled' if settings.ENABLE_WEBSOCKETS else 'Disabled'}")


if __name__ == "__main__":
    validate_settings()
    print_settings_summary()
