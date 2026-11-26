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
    # "chroma" (default) or "memory": an in-memory store loaded from
    # vector_index_file, for hosts that cannot run Chroma (see memory_store.py).
    vector_backend: str = "chroma"
    vector_index_file: str = str(BACKEND_DIR / "vector_index.npz")
    database_url: str = f"sqlite:///{BACKEND_DIR / 'zana.db'}"
    auto_seed_catalogue: bool = False

    claude_model: str = "claude-haiku-4-5-20251001"
    # gemini-2.0-flash and llama-3.1-8b-instant have been retired by their providers.
    gemini_model: str = "gemini-2.5-flash"
    # Gemini 2.5 "thinks" before answering unless told not to; "none" keeps
    # chat fast and stops thinking from using up max_tokens. Empty = provider default.
    gemini_reasoning_effort: str = "none"
    groq_model: str = "openai/gpt-oss-120b"
    llm_provider_chain: str = "anthropic,gemini,groq"

    # Embeddings: OpenAI by default. Any OpenAI-compatible endpoint works by
    # setting EMBEDDING_BASE_URL and EMBEDDING_API_KEY (the hosted demo uses
    # Gemini's: https://generativelanguage.googleapis.com/v1beta/openai/).
    embedding_model: str = "text-embedding-3-small"
    embedding_base_url: str = ""
    embedding_api_key: str = ""

    # Cosine distance above which a chunk counts as "not about this question".
    # It depends on the embedding model, so recalibrate with scripts/eval_rag.py
    # when you change EMBEDDING_MODEL.
    relevant_distance_max: float = 0.45

    # Voice input: OpenAI Whisper by default, or any OpenAI-compatible
    # transcription endpoint (the hosted demo uses Groq's whisper-large-v3).
    transcribe_model: str = "whisper-1"
    transcribe_base_url: str = ""
    transcribe_api_key: str = ""

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
