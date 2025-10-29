"""
🌌 CLIFF Backend Configuration
Centralizes all configuration settings using Pydantic Settings
"""

import os
from typing import List, Optional, Union
from pydantic_settings import BaseSettings
from pydantic import validator, Field
import secrets


class Settings(BaseSettings):
    """
    Application settings - All environment variables and configuration
    """
    
    # =============================================================================
    # APPLICATION SETTINGS
    # =============================================================================
    APP_NAME: str = "CLIFF - Cosmic Level Intelligent Forecast Framework"
    APP_VERSION: str = "1.0.0"
    APP_DESCRIPTION: str = "AI-powered space and Earth threat monitoring platform"
    
    # Environment
    ENVIRONMENT: str = Field(default="development", env="NODE_ENV")
    DEBUG: bool = Field(default=True)
    
    # Server Configuration
    BACKEND_HOST: str = Field(default="0.0.0.0")
    BACKEND_PORT: int = Field(default=8000)
    BACKEND_RELOAD: bool = Field(default=True)
    BACKEND_LOG_LEVEL: str = Field(default="info")
    
    # Frontend Configuration
    FRONTEND_URL: str = Field(default="https://nasa.kynux.dev")
    
    # =============================================================================
    # NASA API CONFIGURATION
    # =============================================================================
    NASA_API_KEY: str = Field(default="DEMO_KEY")
    NASA_BASE_URL: str = Field(default="https://api.nasa.gov")
    
    # NASA API Endpoints
    NASA_NEOWS_URL: str = Field(default="https://api.nasa.gov/neo/rest/v1")
    NASA_EONET_URL: str = Field(default="https://eonet.gsfc.nasa.gov/api/v3")
    NASA_DONKI_URL: str = Field(default="https://api.nasa.gov/DONKI")
    NASA_EPIC_URL: str = Field(default="https://api.nasa.gov/EPIC/api")
    NASA_GIS_URL: str = Field(default="https://gibs.earthdata.nasa.gov/wmts/epsg4326/best")
    NASA_EXOPLANET_URL: str = Field(default="https://exoplanetarchive.ipac.caltech.edu/TAP/sync")
    NASA_SSD_URL: str = Field(default="https://ssd-api.jpl.nasa.gov/cad.api")
    
    # =============================================================================
    # GEMINI 2.5 PRO API CONFIGURATION - NASA Challenge Winning AI 🚀
    # =============================================================================
    # Google AI Studio API Keys
    GOOGLE_API_KEY: str = Field(default="AIzaSyBvhE8k7R2nQ3mL9wJ5xT1pK6aY4fM2qN7s8uV0")
    GEMINI_API_KEY: str = Field(default="AIzaSyBvhE8k7R2nQ3mL9wJ5xT1pK6aY4fM2qN7s8uV0")
    
    # Gemini Models Configuration - Latest and most capable models
    GEMINI_PRO_MODEL: str = Field(default="gemini-2.5-pro")  # Best reasoning for complex educational content
    GEMINI_FLASH_MODEL: str = Field(default="gemini-2.5-pro")  # Fast responses for real-time interactions
    GEMINI_VISION_MODEL: str = Field(default="gemini-2.5-pro")  # Image and diagram analysis
    
    # CLIFF AI Mentor System Models - Specialized for education
    CLIFF_AI_MENTOR_MODEL: str = Field(default="gemini-1.5-pro-002")  # Main AI mentor personality
    CLIFF_AI_EDUCATIONAL_MODEL: str = Field(default="gemini-1.5-flash-002")  # Quick educational responses
    CLIFF_AI_VOICE_MODEL: str = Field(default="gemini-1.5-pro-002")  # Voice interaction processing
    
    # Educational AI Feature Flags
    ENABLE_AI_MENTOR: bool = Field(default=True)  # AI mentor system
    ENABLE_EDUCATIONAL_AI: bool = Field(default=True)  # Educational content generation
    ENABLE_PERSONALIZED_LEARNING: bool = Field(default=True)  # Adaptive learning paths
    ENABLE_AI_QUIZ_GENERATION: bool = Field(default=True)  # AI-generated assessments
    ENABLE_ADAPTIVE_CONTENT: bool = Field(default=True)  # Dynamic content adaptation
    
    # Gemini API Configuration
    GEMINI_MAX_TOKENS: int = Field(default=8192)  # Maximum response tokens
    GEMINI_TEMPERATURE: float = Field(default=0.7)  # Creativity balance for educational content
    GEMINI_TOP_P: float = Field(default=0.9)  # Nucleus sampling for diverse responses
    GEMINI_TOP_K: int = Field(default=40)  # Top-k sampling for quality control
    
    # =============================================================================
    # CUSTOM VERTEX AI CONFIGURATION
    # =============================================================================
    # Custom Vertex AI API Configuration
    VERTEX_AI_BASE_URL: str = Field(default="https://beta.vertexapis.com")
    VERTEX_AI_API_KEY: str = Field(default="sk-1a67670ecba1415cb332ec77880e0caa")
    VERTEX_AI_PROJECT_ID: str = Field(default="cliff-ai-project")  # Real project for Gemini 2.5 Pro
    VERTEX_AI_LOCATION: str = Field(default="us-central1")  # Standard US location
    
    # Vertex AI Models - Optimized with insights from advanced bot implementation
    VERTEX_AI_TEXT_MODEL: str = Field(default="gemini-2.5-pro")  # Best-in-class for reasoning and analysis
    VERTEX_AI_VISION_MODEL: str = Field(default="gemini-2.5-pro")  # Unified model for text and vision
    VERTEX_AI_FAST_MODEL: str = Field(default="gemini-1.5-flash-002")  # For real-time alerts and quick responses
    VERTEX_AI_VIDEO_MODEL: str = Field(default="veo-3.0") # State-of-the-art video generation
    VERTEX_AI_IMAGE_MODEL: str = Field(default="imagen-3.0-generate-002") # High-quality image generation
    VERTEX_AI_EMBEDDING_MODEL: str = Field(default="text-embedding-004")  # For semantic search and context
    
    # Cortex AI Configuration - Using Grok as primary model
    CORTEX_API_KEY: str = Field(default="sk-1a67670ecba1415cb332ec77880e0caa")
    CORTEX_BASE_URL: str = Field(default="https://cortexapi.net/v1/chat/completions")
    CORTEX_CHAT_MODEL: str = Field(default="grok-4-fast-reasoning")  # Primary chat model
    
    # Image Generation Configuration
    CORTEX_IMAGE_API_KEY: str = Field(default="sk-1a67670ecba1415cb332ec77880e0caa")
    CORTEX_IMAGE_BASE_URL: str = Field(default="https://cortexapi.net/v1/chat/completions")
    CORTEX_IMAGE_MODEL: str = Field(default="imagen-4.0-ultra-generate-preview-06-06")
    
    # Grok AI Configuration - Fast reasoning chat model via CortexAPI
    GROK_API_KEY: str = Field(default="sk-1a67670ecba1415cb332ec77880e0caa")
    GROK_BASE_URL: str = Field(default="https://cortexapi.net/v1/chat/completions")
    GROK_CHAT_MODEL: str = Field(default="grok-4-fast-reasoning")
    GROK_MAX_TOKENS: int = Field(default=4096)
    GROK_TEMPERATURE: float = Field(default=0.7)
    
    # Google Cloud Text-to-Speech Configuration
    TEXT_TO_SPEECH_ENABLED: bool = Field(default=True)
    TEXT_TO_SPEECH_VOICE_NAME: str = Field(default="en-US-Neural2-J")
    TEXT_TO_SPEECH_LANGUAGE_CODE: str = Field(default="en-US")
    
    # Legacy AI Services (for backward compatibility)
    AI_SERVICES_BASE_URL: str = Field(default="http://localhost:8002")
    AI_SERVICES_API_KEY: str = Field(default="your_ai_services_key_here")
    
    # AI Service Models (mapped to Vertex AI)
    AI_LIVE_SCREEN_MODEL: str = Field(default="gemini-1.5-pro-vision")
    AI_VISUAL_ENHANCER_MODEL: str = Field(default="gemini-1.5-pro-vision")
    AI_MULTIMODAL_MODEL: str = Field(default="gemini-1.5-pro-vision")
    AI_VOICE_SYNTHESIZER_MODEL: str = Field(default="text-to-speech")
    AI_MUSIC_GENERATOR_MODEL: str = Field(default="music-lm")
    
    # =============================================================================
    # DATABASE CONFIGURATION
    # =============================================================================
    # MongoDB Database
    MONGODB_URL: str = Field(default="mongodb+srv://kralbotcu3141:kralbotcu3141@cluster0.af5h8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
    MONGODB_HOST: str = Field(default="localhost")
    MONGODB_PORT: int = Field(default=27017)
    MONGODB_NAME: str = Field(default="cliff_db")
    MONGODB_USER: str = Field(default="cliff_user")
    MONGODB_PASSWORD: str = Field(default="cliff_pass_2025")
    
    # Redis Cache and Session Store
    REDIS_URL: str = Field(default="redis://localhost:6379/0")
    REDIS_HOST: str = Field(default="localhost")
    REDIS_PORT: int = Field(default=6379)
    REDIS_PASSWORD: Optional[str] = Field(default="cliff_redis_2025")
    
    # Elasticsearch for Full-text Search
    ELASTICSEARCH_URL: str = Field(default="http://localhost:9200")
    ELASTICSEARCH_HOST: str = Field(default="localhost")
    ELASTICSEARCH_PORT: int = Field(default=9200)
    
    # =============================================================================
    # SECURITY CONFIGURATION
    # =============================================================================
    # JWT Configuration
    JWT_SECRET: str = Field(default_factory=lambda: secrets.token_urlsafe(32))
    JWT_ALGORITHM: str = Field(default="HS256")
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30)
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7)
    
    # API Security
    API_SECRET_KEY: str = Field(default_factory=lambda: secrets.token_urlsafe(32))
    API_RATE_LIMIT_PER_MINUTE: int = Field(default=100)
    
    # Session Security
    SESSION_SECRET: str = Field(default_factory=lambda: secrets.token_urlsafe(32))
    COOKIE_SECRET: str = Field(default_factory=lambda: secrets.token_urlsafe(32))
    
    # CORS Configuration
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
    
    # Allowed hosts for production
    ALLOWED_HOSTS: List[str] = Field(
        default=["localhost", "127.0.0.1", "nasa.kynux.dev", "cliff-app.com"]
    )
    
    # =============================================================================
    # PERFORMANCE CONFIGURATION
    # =============================================================================
    # Worker Configuration
    WORKER_PROCESSES: int = Field(default=4)
    WORKER_CONNECTIONS: int = Field(default=1000)
    WORKER_TIMEOUT: int = Field(default=30)
    
    # Cache Configuration
    CACHE_TTL_SECONDS: int = Field(default=300)  # 5 minutes
    CACHE_MAX_SIZE_MB: int = Field(default=1024)  # 1GB
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS_PER_MINUTE: int = Field(default=60)
    RATE_LIMIT_BURST_SIZE: int = Field(default=10)
    
    # =============================================================================
    # THREAT SCHEDULER
    # =============================================================================
    ENABLE_SCHEDULER: bool = Field(default=True)
    THREAT_REFRESH_SECONDS: int = Field(default=1800)
    
    
    # =============================================================================
    # EXTERNAL SERVICES
    # =============================================================================
    # CDN Configuration
    CDN_BASE_URL: str = Field(default="https://cdn.cliff-app.com")
    STATIC_FILES_URL: str = Field(default="http://localhost:8000/static")
    
    # Monitoring and Logging
    GRAFANA_URL: str = Field(default="http://localhost:3001")
    PROMETHEUS_URL: str = Field(default="http://localhost:9090")
    ELASTICSEARCH_LOGS_INDEX: str = Field(default="cliff-logs")
    
    # Email Service (for alerts)
    EMAIL_SERVICE_ENABLED: bool = Field(default=False)
    EMAIL_SMTP_HOST: str = Field(default="smtp.gmail.com")
    EMAIL_SMTP_PORT: int = Field(default=587)
    EMAIL_SMTP_USER: Optional[str] = Field(default=None)
    EMAIL_SMTP_PASSWORD: Optional[str] = Field(default=None)
    
    # Push Notifications
    PUSH_NOTIFICATIONS_ENABLED: bool = Field(default=True)
    FIREBASE_SERVER_KEY: Optional[str] = Field(default=None)
    VAPID_PUBLIC_KEY: Optional[str] = Field(default=None)
    VAPID_PRIVATE_KEY: Optional[str] = Field(default=None)
    
    # =============================================================================
    # FEATURE FLAGS
    # =============================================================================
    # AI Features
    ENABLE_VOICE_INTERFACE: bool = Field(default=True)
    ENABLE_3D_VISUALIZATION: bool = Field(default=True)
    ENABLE_CUSTOM_AI: bool = Field(default=True)
    ENABLE_SCREEN_ANALYSIS: bool = Field(default=True)
    
    # Monitoring Features
    ENABLE_ASTEROID_MONITORING: bool = Field(default=True)
    ENABLE_EARTH_MONITORING: bool = Field(default=True)
    ENABLE_SPACE_WEATHER: bool = Field(default=True)
    ENABLE_EXOPLANET_DISCOVERY: bool = Field(default=True)
    
    # Platform Features
    ENABLE_MOBILE_APP: bool = Field(default=True)
    ENABLE_DESKTOP_APP: bool = Field(default=True)
    ENABLE_VR_INTERFACE: bool = Field(default=True)
    ENABLE_VOICE_COMMANDS: bool = Field(default=True)
    
    # Real-time Features
    ENABLE_WEBSOCKETS: bool = Field(default=True)
    ENABLE_PUSH_NOTIFICATIONS: bool = Field(default=True)
    ENABLE_REAL_TIME_ALERTS: bool = Field(default=True)
    
    # =============================================================================
    # DEVELOPMENT CONFIGURATION
    # =============================================================================
    # Debug Settings
    VERBOSE_LOGGING: bool = Field(default=True)
    SQL_ECHO: bool = Field(default=False)
    
    # Hot Reload
    FAST_RELOAD: bool = Field(default=True)
    AUTO_RESTART: bool = Field(default=True)
    
    # Testing
    TEST_DATABASE_URL: str = Field(default="mongodb://cliff_user:cliff_pass_2025@localhost:27017/cliff_test?authSource=admin")
    TEST_REDIS_URL: str = Field(default="redis://localhost:6380/0")
    
    # =============================================================================
    # VALIDATORS
    # =============================================================================
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
    
    # =============================================================================
    # COMPUTED PROPERTIES
    # =============================================================================
    @property
    def is_development(self) -> bool:
        """Check if running in development mode"""
        return self.ENVIRONMENT == "development"
    
    @property
    def is_production(self) -> bool:
        """Check if running in production mode"""
        return self.ENVIRONMENT == "production"
    
    @property
    def is_testing(self) -> bool:
        """Check if running in test mode"""
        return self.ENVIRONMENT == "test"
    
    # =============================================================================
    # CLASS CONFIGURATION
    # =============================================================================
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"  # Ignore extra fields from .env
        
        # Allow reading from environment variables
        env_prefix = ""
        
        # Schema extra for documentation
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


# Create global settings instance
settings = Settings()


# Export settings validation function
def get_settings() -> Settings:
    """
    Get application settings instance
    Used for dependency injection in FastAPI
    """
    return settings


# Settings validation function
def validate_settings() -> bool:
    """
    Validate all required settings are properly configured
    Returns True if valid, raises ValueError if invalid
    """
    try:
        # Check required API keys in production
        if settings.is_production:
            if settings.NASA_API_KEY == "DEMO_KEY":
                raise ValueError("NASA_API_KEY must be set in production")
            
            if settings.VERTEX_AI_PROJECT_ID == "your-gcp-project-id":
                raise ValueError("VERTEX_AI_PROJECT_ID must be set in production")
            
            if "your_ai_services_key_here" in settings.AI_SERVICES_API_KEY:
                raise ValueError("AI_SERVICES_API_KEY must be set in production")
        
        # Check database URLs
        if not settings.MONGODB_URL:
            raise ValueError("MONGODB_URL must be set")
        
        if not settings.REDIS_URL:
            raise ValueError("REDIS_URL must be set")
        
        # Check security keys
        if len(settings.JWT_SECRET) < 32:
            raise ValueError("JWT_SECRET must be at least 32 characters long")
        
        return True
        
    except Exception as e:
        print(f"❌ Settings validation failed: {str(e)}")
        raise


# Print settings summary (for debugging)
def print_settings_summary():
    """Print a summary of current settings (for debugging)"""
    if settings.DEBUG:
        print("🔧 CLIFF Backend Settings Summary:")
        print(f"   Environment: {settings.ENVIRONMENT}")
        print(f"   Backend Port: {settings.BACKEND_PORT}")
        print(f"   Database: {settings.MONGODB_HOST}:{settings.MONGODB_PORT}")
        print(f"   Redis: {settings.REDIS_HOST}:{settings.REDIS_PORT}")
        print(f"   NASA API: {'Configured' if settings.NASA_API_KEY != 'DEMO_KEY' else 'DEMO_KEY'}")
        print(f"   Custom AI: {'Enabled' if settings.ENABLE_CUSTOM_AI else 'Disabled'}")
        print(f"   Voice Interface: {'Enabled' if settings.ENABLE_VOICE_INTERFACE else 'Disabled'}")
        print(f"   WebSockets: {'Enabled' if settings.ENABLE_WEBSOCKETS else 'Disabled'}")


# Initialize settings validation
if __name__ == "__main__":
    validate_settings()
    print_settings_summary()