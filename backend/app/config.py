from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    api_base_url: str = "http://localhost:8000"
    cors_origins: str = "http://localhost:3000"
    database_url: str = "sqlite:///./tara.db"
    llm_provider: str = "mock"
    llm_api_key: str = ""
    llm_model: str = "mock"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
