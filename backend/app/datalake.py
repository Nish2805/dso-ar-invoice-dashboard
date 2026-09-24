"""
Thin wrapper around the Azure Data Lake SDK. Same client pattern as
scripts/explore_data.py, reused here instead of duplicated.
"""
import io

import pandas as pd
from azure.identity import ClientSecretCredential
from azure.storage.filedatalake import DataLakeServiceClient

from app.config import settings


def get_service_client() -> DataLakeServiceClient:
    credential = ClientSecretCredential(
        tenant_id=settings.azure_tenant_id,
        client_id=settings.azure_client_id,
        client_secret=settings.azure_client_secret,
    )
    account_url = f"https://{settings.azure_storage_account_name}.dfs.core.windows.net"
    return DataLakeServiceClient(account_url=account_url, credential=credential)


def list_csv_paths(service_client: DataLakeServiceClient) -> list[str]:
    filesystem = service_client.get_file_system_client(settings.azure_filesystem_name)
    paths = filesystem.get_paths(path=settings.azure_data_path, recursive=True)
    return [p.name for p in paths if not p.is_directory and p.name.lower().endswith(".csv")]


def read_csv(service_client: DataLakeServiceClient, path: str) -> pd.DataFrame:
    filesystem = service_client.get_file_system_client(settings.azure_filesystem_name)
    file_client = filesystem.get_file_client(path)
    raw = file_client.download_file().readall()
    return pd.read_csv(io.BytesIO(raw))
