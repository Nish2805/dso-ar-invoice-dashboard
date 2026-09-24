"""
Connects to Azure Data Lake, finds CSV files under AZURE_DATA_PATH, and prints
schema, null rates, and cross-file relationship findings (join key overlap
between customer-like and invoice-like files).

Run from backend/: python scripts/explore_data.py
"""
import io
import os
import sys

import pandas as pd
from azure.identity import ClientSecretCredential
from azure.storage.filedatalake import DataLakeServiceClient
from dotenv import load_dotenv

load_dotenv()

REQUIRED_VARS = [
    "AZURE_TENANT_ID",
    "AZURE_CLIENT_ID",
    "AZURE_CLIENT_SECRET",
    "AZURE_STORAGE_ACCOUNT_NAME",
    "AZURE_FILESYSTEM_NAME",
]


def get_service_client() -> DataLakeServiceClient:
    missing = [v for v in REQUIRED_VARS if not os.getenv(v)]
    if missing:
        print(f"Missing required env vars: {', '.join(missing)}")
        print("Copy backend/.env.example to backend/.env and fill in values.")
        sys.exit(1)

    credential = ClientSecretCredential(
        tenant_id=os.environ["AZURE_TENANT_ID"],
        client_id=os.environ["AZURE_CLIENT_ID"],
        client_secret=os.environ["AZURE_CLIENT_SECRET"],
    )
    account_url = f"https://{os.environ['AZURE_STORAGE_ACCOUNT_NAME']}.dfs.core.windows.net"
    return DataLakeServiceClient(account_url=account_url, credential=credential)


def list_csv_paths(service_client: DataLakeServiceClient) -> list[str]:
    filesystem = service_client.get_file_system_client(os.environ["AZURE_FILESYSTEM_NAME"])
    root_path = os.getenv("AZURE_DATA_PATH", "") or ""
    paths = filesystem.get_paths(path=root_path, recursive=True)
    return [p.name for p in paths if not p.is_directory and p.name.lower().endswith(".csv")]


def read_csv(service_client: DataLakeServiceClient, path: str) -> pd.DataFrame:
    filesystem = service_client.get_file_system_client(os.environ["AZURE_FILESYSTEM_NAME"])
    file_client = filesystem.get_file_client(path)
    download = file_client.download_file()
    raw = download.readall()
    return pd.read_csv(io.BytesIO(raw))


def profile_dataframe(name: str, df: pd.DataFrame) -> None:
    print(f"\n{'=' * 60}\n{name}\n{'=' * 60}")
    print(f"rows: {len(df)}  columns: {len(df.columns)}")
    print("\ncolumns / dtype / null % / unique count:")
    for col in df.columns:
        null_pct = df[col].isna().mean() * 100
        nunique = df[col].nunique(dropna=True)
        print(f"  {col:<30} {str(df[col].dtype):<10} null={null_pct:5.1f}%  unique={nunique}")
    print("\nsample rows:")
    print(df.head(3).to_string())

    low_card_cols = [
        c for c in df.columns
        if df[c].dtype == object and 1 < df[c].nunique(dropna=True) <= 20
    ]
    if low_card_cols:
        print(f"\ncandidate breakdown columns (low-cardinality text): {low_card_cols}")

    numeric_cols = df.select_dtypes(include="number").columns.tolist()
    if numeric_cols:
        print(f"numeric columns (candidate KPI/metric fields): {numeric_cols}")

    date_like = [c for c in df.columns if "date" in c.lower() or "time" in c.lower()]
    if date_like:
        print(f"date-like columns: {date_like}")


def find_join_keys(customers: pd.DataFrame, invoices: pd.DataFrame) -> None:
    print(f"\n{'=' * 60}\nRelationship check: customers <-> invoices\n{'=' * 60}")
    shared_cols = set(customers.columns) & set(invoices.columns)
    id_like = [c for c in shared_cols if "id" in c.lower()]
    candidates = id_like or list(shared_cols)

    if not candidates:
        print("No shared column names found — inspect manually for a join key.")
        return

    for col in candidates:
        cust_vals = set(customers[col].dropna().unique())
        inv_vals = set(invoices[col].dropna().unique())
        if not inv_vals:
            continue
        overlap = len(inv_vals & cust_vals)
        match_rate = overlap / len(inv_vals) * 100
        orphaned = len(inv_vals - cust_vals)
        print(
            f"  key='{col}': {match_rate:.1f}% of invoice values found in customers "
            f"({overlap}/{len(inv_vals)}), {orphaned} orphaned invoice values"
        )


def main() -> None:
    service_client = get_service_client()
    csv_paths = list_csv_paths(service_client)

    if not csv_paths:
        print("No CSV files found under AZURE_DATA_PATH. Check AZURE_FILESYSTEM_NAME / AZURE_DATA_PATH.")
        return

    print(f"Found {len(csv_paths)} CSV file(s):")
    for p in csv_paths:
        print(f"  - {p}")

    frames: dict[str, pd.DataFrame] = {}
    for path in csv_paths:
        df = read_csv(service_client, path)
        frames[path] = df
        profile_dataframe(path, df)

    customer_files = [p for p in frames if "customer" in p.lower()]
    invoice_files = [p for p in frames if "invoice" in p.lower()]

    if customer_files and invoice_files:
        find_join_keys(frames[customer_files[0]], frames[invoice_files[0]])
    else:
        print("\nCould not auto-identify customer/invoice files by name — rename check skipped.")
        print(f"customer_files matched: {customer_files}")
        print(f"invoice_files matched: {invoice_files}")


if __name__ == "__main__":
    main()
