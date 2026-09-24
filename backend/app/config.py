from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Local-first data source (see plan Phase 0) — the 5 source CSVs already
    # downloaded to this directory, relative to backend/.
    local_data_dir: str = "data/raw"

    # Azure creds are optional for now (unused while data_source is local);
    # kept for the later swap to live ADLS reads via app/datalake.py.
    azure_tenant_id: str | None = None
    azure_client_id: str | None = None
    azure_client_secret: str | None = None
    azure_storage_account_name: str | None = None
    azure_filesystem_name: str | None = None
    azure_data_path: str = ""

    cors_origins: list[str] = ["http://localhost:5173"]

    model_config = SettingsConfigDict(env_file=".env", env_prefix="", case_sensitive=False)


settings = Settings()
