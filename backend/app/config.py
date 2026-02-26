"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    cerebras_api_key: str = ""
    database_url: str = "sqlite+aiosqlite:///./research.db"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    upload_dir: str = "./uploads"
    vector_store_dir: str = "./vector_stores"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
