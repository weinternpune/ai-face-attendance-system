from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    ENVIRONMENT: str = "development"
    
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "weintern_attendance"
    
    JWT_SECRET_KEY: str = "weintern_super_secret_jwt_key_change_in_production_2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    DEFAULT_ADMIN_EMAIL: str = "admin@weintern.com"
    DEFAULT_ADMIN_PASSWORD: str = "WeInternAdminPass2026"
    DEFAULT_ADMIN_NAME: str = "System Administrator"
    
    RECOGNITION_THRESHOLD: float = 0.32
    REVIEW_THRESHOLD: float = 0.20
    OFFICE_START_TIME: str = "10:00"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
