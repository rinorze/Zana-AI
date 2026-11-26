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
    gemini_api_key: str = ""
    groq_api_key: str = ""

    jwt_secret: str = "dev-secret-do-not-use-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiry_hours: int = 24

    admin_username: str = "admin"
    admin_password: str = "changeme"
    agent_username: str = "agent"
    agent_password: str = "changeme"

    chroma_persist_dir: str = str(BACKEND_DIR / "chroma_data")
    database_url: str = f"sqlite:///{BACKEND_DIR / 'zana.db'}"
    auto_seed_catalogue: bool = False

    claude_model: str = "claude-haiku-4-5-20251001"
    gemini_model: str = "gemini-2.0-flash"
    groq_model: str = "llama-3.1-8b-instant"
    llm_provider_chain: str = "anthropic,gemini,groq"
    embedding_model: str = "text-embedding-3-small"

    frontend_url: str = "http://localhost:3000"

    # "production" makes startup fail if JWT_SECRET or the demo passwords are
    # still the development defaults, and builds the search index on boot.
    environment: str = "development"
    # Build the Chroma index on startup when it is empty (needs OPENAI_API_KEY).
    auto_index_catalogue: bool = False

    # Public endpoint limits. See app/middleware/rate_limit.py.
    rate_limit_enabled: bool = True
    trust_proxy_headers: bool = False
    chat_per_minute: int = 6
    chat_per_ip_per_day: int = 40
    chat_daily_cap: int = 200
    search_per_minute: int = 30
    voice_per_minute: int = 3
    voice_per_ip_per_day: int = 20
    login_per_minute: int = 5

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
