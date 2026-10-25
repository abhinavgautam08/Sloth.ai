import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "Sloth.ai"
    app_version: str = "0.1.0"
    ollama_host: str = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    # Default model can be configured; if not present, the service detects installed models
    default_model: str = os.getenv("DEFAULT_MODEL", "codellama:latest")
    max_upload_size_bytes: int = 10 * 1024 * 1024  # 10 MB
    allowed_extensions: list[str] = [".txt", ".md", ".pdf"]
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    model_config = SettingsConfigDict(env_file=".env", extra="allow")

settings = Settings()
