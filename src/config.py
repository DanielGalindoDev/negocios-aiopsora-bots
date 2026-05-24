import os
from typing import Dict
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # N8N Configuration
    N8N_API_URL: str
    N8N_API_KEY: str
    
    # Database / PostgreSQL Configuration
    DATABASE_URL: str
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "password"
    POSTGRES_DB: str = "n8n_db"
    POSTGRES_HOST: str = "db"

    # Settings configurations to automatically read from .env if present
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def n8n_headers(self) -> Dict[str, str]:
        """Genera dinámicamente las cabeceras HTTP para autenticarse con N8N."""
        return {
            "X-N8N-API-KEY": self.N8N_API_KEY,
            "Content-Type": "application/json"
        }

# Singleton instance of settings
settings = Settings()
