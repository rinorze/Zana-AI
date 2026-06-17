from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    anthropic_api_key: str = ""
    openai_api_key: str = ""

    jwt_secret: str = "dev-secret-do-not-use-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiry_hours: int = 24

    admin_username: str = "admin"
    admin_password: str = "changeme"
    agent_username: str = "agent"
    agent_password: str = "changeme"

    chroma_persist_dir: str = str(BACKEND_DIR / "chroma_data")
    database_url: str = f"sqlite:///{BACKEND_DIR / 'zana.db'}"

    claude_model: str = "claude-haiku-4-5-20251001"
    embedding_model: str = "text-embedding-3-small"

    frontend_url: str = "http://localhost:3000"


@lru_cache
def get_settings() -> Settings:
    return Settings()
