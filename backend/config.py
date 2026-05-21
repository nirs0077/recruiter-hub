from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Firebase
    firebase_credentials_path: str = "firebase-credentials.json"
    firebase_storage_bucket: str = ""

    # Anthropic
    anthropic_api_key: str = ""

    # JWT
    secret_key: str = "change-this-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days

    # App
    score_threshold: float = 75.0
    frontend_url: str = "http://localhost:5173"

    # SMTP (optional — leave empty to disable email notifications)
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
