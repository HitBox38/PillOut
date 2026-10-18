"""Turso (libSQL) client helpers."""

import asyncio
import os
import re
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from pathlib import Path

import libsql

from .catalog import seed_catalog

API_ROOT = Path(__file__).resolve().parent.parent.parent
SCHEMA_PATH = API_ROOT / "schema.sql"

RowDict = dict[str, object]

DEFAULT_TURSO_DATABASE_URL = (
    "libsql://pillout-vercel-icfg-kk8uexgksl4uxxe5pqxwqvh7.aws-eu-west-1.turso.io"
)


@dataclass(frozen=True, slots=True)
class ResultSet:
    columns: tuple[str, ...]
    rows: list[tuple[object, ...]]
    last_insert_rowid: int | None


class DatabaseClient:
    """Run the synchronous HTTP SDK on one worker with a single connection."""

    def __init__(self, url: str, token: str) -> None:
        self._url = url
        self._token = token
        self._executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="pillout-db")
        self._connection: libsql.Connection | None = None
        self._closed = False

    async def execute(self, sql: str, args: list[object] | None = None) -> ResultSet:
        if self._closed:
            raise RuntimeError("Database client is closed")
        return await asyncio.get_running_loop().run_in_executor(
            self._executor, self._execute, sql, args
        )

    def _execute(self, sql: str, args: list[object] | None) -> ResultSet:
        if self._connection is None:
            self._connection = libsql.connect(
                self._url, auth_token=self._token, isolation_level=None
            )
        cursor = self._connection.execute(sql, args or [])
        try:
            return ResultSet(
                columns=tuple(str(column[0]) for column in cursor.description),
                rows=cursor.fetchall() or [],
                last_insert_rowid=cursor.lastrowid,
            )
        finally:
            cursor.close()

    async def close(self) -> None:
        if self._closed:
            return
        self._closed = True
        try:
            await asyncio.get_running_loop().run_in_executor(self._executor, self._close)
        finally:
            self._executor.shutdown(wait=False)

    def _close(self) -> None:
        if self._connection is not None:
            self._connection.close()
            self._connection = None


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


def create_db_client() -> DatabaseClient:
    url, token = turso_config()
    return DatabaseClient(url, token)


def row_dicts(result: ResultSet) -> list[RowDict]:
    columns = result.columns
    return [{columns[i]: row[i] for i in range(len(columns))} for row in result.rows]


def first_row(result: ResultSet) -> RowDict | None:
    mapped = row_dicts(result)
    return mapped[0] if mapped else None


def inserted_row_id(result: ResultSet) -> int:
    row_id = result.last_insert_rowid
    if row_id is None:
        msg = "Insert did not return a row id"
        raise ValueError(msg)
    return int(row_id)


def _schema_statements(schema_sql: str) -> list[str]:
    without_comments = re.sub(r"--[^\n]*", "", schema_sql)
    return [part.strip() for part in without_comments.split(";") if part.strip()]


async def init_schema(db: DatabaseClient) -> None:
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
