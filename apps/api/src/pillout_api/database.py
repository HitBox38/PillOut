"""Turso (libSQL) client helpers."""

import os
import re
from pathlib import Path

import libsql_client

from pillout_api.catalog import seed_catalog

API_ROOT = Path(__file__).resolve().parent.parent.parent
SCHEMA_PATH = API_ROOT / "schema.sql"

RowDict = dict[str, object]

DEFAULT_TURSO_DATABASE_URL = (
    "libsql://pillout-vercel-icfg-kk8uexgksl4uxxe5pqxwqvh7.aws-eu-west-1.turso.io"
)


def cell_int(value: object) -> int:
    if isinstance(value, int):
        return value
    if isinstance(value, str):
        return int(value)
    msg = f"Expected integer database value, got {type(value).__name__}"
    raise TypeError(msg)


def turso_config() -> tuple[str, str]:
    url = os.environ.get("TURSO_DATABASE_URL") or DEFAULT_TURSO_DATABASE_URL
    token = os.environ.get("TURSO_AUTH_TOKEN", "")
    return url, token


def create_db_client() -> libsql_client.Client:
    url, token = turso_config()
    return libsql_client.create_client(url=url, auth_token=token)


def row_dicts(result: libsql_client.ResultSet) -> list[RowDict]:
    columns = result.columns
    return [{columns[i]: row[i] for i in range(len(columns))} for row in result.rows]


def first_row(result: libsql_client.ResultSet) -> RowDict | None:
    mapped = row_dicts(result)
    return mapped[0] if mapped else None


def inserted_row_id(result: libsql_client.ResultSet) -> int:
    row_id = result.last_insert_rowid
    if row_id is None:
        msg = "Insert did not return a row id"
        raise ValueError(msg)
    return int(row_id)


def _schema_statements(schema_sql: str) -> list[str]:
    without_comments = re.sub(r"--[^\n]*", "", schema_sql)
    return [part.strip() for part in without_comments.split(";") if part.strip()]


async def init_schema(db: libsql_client.Client) -> None:
    await db.execute("PRAGMA foreign_keys = ON")
    schema_sql = SCHEMA_PATH.read_text(encoding="utf-8")
    for statement in _schema_statements(schema_sql):
        if statement.upper().startswith("PRAGMA "):
            continue
        await db.execute(statement)

    # CREATE TABLE IF NOT EXISTS does not upgrade databases created by earlier versions.
    for table, column, definition in (
        ("drugs", "catalog_key", "TEXT"),
        ("avatars", "catalog_key", "TEXT"),
        ("users", "avatar_id", "INTEGER REFERENCES avatars (id) ON DELETE SET NULL"),
    ):
        columns = row_dicts(await db.execute(f"PRAGMA table_info({table})"))
        if not any(row["name"] == column for row in columns):
            await db.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")

    for table in ("drugs", "avatars"):
        await db.execute(
            f"CREATE UNIQUE INDEX IF NOT EXISTS idx_{table}_catalog_key ON {table} (catalog_key)"
        )
    await seed_catalog(db)
