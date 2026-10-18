"""ASGI application entry point, independent of any hosting provider."""

import os
import sqlite3
from collections.abc import AsyncIterator, Generator
from contextlib import asynccontextmanager, contextmanager
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, FastAPI, HTTPException, status
from pydantic import BaseModel, Field

API_ROOT = Path(__file__).resolve().parent.parent.parent
SCHEMA_PATH = API_ROOT / "schema.sql"
DEFAULT_DB_PATH = API_ROOT / "data" / "pillout.sqlite"


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: Literal["pillout-api"] = "pillout-api"


# --- Users ---


class UserCreate(BaseModel):
    first_name: str = Field(min_length=1, max_length=200)
    last_name: str = Field(min_length=1, max_length=200)
    nickname: str | None = Field(default=None, max_length=100)
    avatar_filename: str | None = Field(default=None, max_length=500)


class UserUpdate(BaseModel):
    id: int = Field(ge=1)
    first_name: str | None = Field(default=None, min_length=1, max_length=200)
    last_name: str | None = Field(default=None, min_length=1, max_length=200)
    nickname: str | None = Field(default=None, max_length=100)
    avatar_filename: str | None = Field(default=None, max_length=500)


class UserIdRequest(BaseModel):
    id: int = Field(ge=1)


class UserResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    nickname: str | None
    avatar_filename: str | None


class UsersListRequest(BaseModel):
    pass


# --- Drugs ---


class DrugCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=4000)
    asset_filename: str = Field(min_length=1, max_length=500)


class DrugUpdate(BaseModel):
    id: int = Field(ge=1)
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=4000)
    asset_filename: str | None = Field(default=None, min_length=1, max_length=500)


class DrugIdRequest(BaseModel):
    id: int = Field(ge=1)


class DrugResponse(BaseModel):
    id: int
    name: str
    description: str
    asset_filename: str


class DrugsListRequest(BaseModel):
    pass


# --- User–drug links ---


class UserDrugCreate(BaseModel):
    user_id: int = Field(ge=1)
    drug_id: int = Field(ge=1)


class UserDrugIdRequest(BaseModel):
    id: int = Field(ge=1)


class UserDrugResponse(BaseModel):
    id: int
    user_id: int
    drug_id: int


class UserDrugsListRequest(BaseModel):
    user_id: int | None = Field(default=None, ge=1)
    drug_id: int | None = Field(default=None, ge=1)


# --- Avatars ---


class AvatarCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    filename: str = Field(min_length=1, max_length=500)


class AvatarUpdate(BaseModel):
    id: int = Field(ge=1)
    name: str | None = Field(default=None, min_length=1, max_length=200)
    filename: str | None = Field(default=None, min_length=1, max_length=500)


class AvatarIdRequest(BaseModel):
    id: int = Field(ge=1)


class AvatarResponse(BaseModel):
    id: int
    name: str
    filename: str


class AvatarsListRequest(BaseModel):
    pass


# --- User–avatar links ---


class UserAvatarCreate(BaseModel):
    user_id: int = Field(ge=1)
    avatar_id: int = Field(ge=1)


class UserAvatarIdRequest(BaseModel):
    id: int = Field(ge=1)


class UserAvatarResponse(BaseModel):
    id: int
    user_id: int
    avatar_id: int


class UserAvatarsListRequest(BaseModel):
    user_id: int | None = Field(default=None, ge=1)
    avatar_id: int | None = Field(default=None, ge=1)


def _db_path() -> Path:
    raw = os.environ.get("PILLOUT_DB_PATH")
    return Path(raw) if raw else DEFAULT_DB_PATH


def _inserted_id(cursor: sqlite3.Cursor) -> int:
    if cursor.lastrowid is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Insert did not return a row id",
        )
    return int(cursor.lastrowid)


def _migrate_users(conn: sqlite3.Connection) -> None:
    columns = {str(row[1]) for row in conn.execute("PRAGMA table_info(users)")}
    if "nickname" not in columns:
        conn.execute("ALTER TABLE users ADD COLUMN nickname TEXT")
    if "avatar_filename" not in columns:
        conn.execute("ALTER TABLE users ADD COLUMN avatar_filename TEXT")


def init_db(db_path: Path) -> None:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    schema_sql = SCHEMA_PATH.read_text(encoding="utf-8")
    with sqlite3.connect(db_path) as conn:
        conn.executescript(schema_sql)
        _migrate_users(conn)
        conn.commit()


@contextmanager
def get_db() -> Generator[sqlite3.Connection, None, None]:
    conn = sqlite3.connect(_db_path())
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


USER_SELECT = "id, first_name, last_name, nickname, avatar_filename"


def _optional_text(value: object | None) -> str | None:
    return None if value is None else str(value)


def _row_user(row: sqlite3.Row) -> UserResponse:
    return UserResponse(
        id=int(row["id"]),
        first_name=str(row["first_name"]),
        last_name=str(row["last_name"]),
        nickname=_optional_text(row["nickname"]),
        avatar_filename=_optional_text(row["avatar_filename"]),
    )


def _row_drug(row: sqlite3.Row) -> DrugResponse:
    return DrugResponse(
        id=int(row["id"]),
        name=str(row["name"]),
        description=str(row["description"]),
        asset_filename=str(row["asset_filename"]),
    )


def _row_user_drug(row: sqlite3.Row) -> UserDrugResponse:
    return UserDrugResponse(
        id=int(row["id"]),
        user_id=int(row["user_id"]),
        drug_id=int(row["drug_id"]),
    )


AVATAR_SELECT = "id, name, filename"


def _row_avatar(row: sqlite3.Row) -> AvatarResponse:
    return AvatarResponse(
        id=int(row["id"]),
        name=str(row["name"]),
        filename=str(row["filename"]),
    )


def _row_user_avatar(row: sqlite3.Row) -> UserAvatarResponse:
    return UserAvatarResponse(
        id=int(row["id"]),
        user_id=int(row["user_id"]),
        avatar_id=int(row["avatar_id"]),
    )


def _require_user(conn: sqlite3.Connection, user_id: int) -> UserResponse:
    row = conn.execute(
        f"SELECT {USER_SELECT} FROM users WHERE id = ?",
        (user_id,),
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return _row_user(row)


def _require_drug(conn: sqlite3.Connection, drug_id: int) -> DrugResponse:
    row = conn.execute(
        "SELECT id, name, description, asset_filename FROM drugs WHERE id = ?",
        (drug_id,),
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Drug not found")
    return _row_drug(row)


def _require_avatar(conn: sqlite3.Connection, avatar_id: int) -> AvatarResponse:
    row = conn.execute(
        f"SELECT {AVATAR_SELECT} FROM avatars WHERE id = ?",
        (avatar_id,),
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Avatar not found")
    return _row_avatar(row)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    init_db(_db_path())
    yield


app = FastAPI(title="Pillout API", version="0.1.0", lifespan=lifespan)
router = APIRouter(prefix="/api")


@router.get("/health", response_model=HealthResponse, tags=["health"])
def health() -> HealthResponse:
    """Report that the API is serving requests."""
    return HealthResponse()


@router.post("/user", response_model=UserResponse, tags=["users"])
def create_user(body: UserCreate) -> UserResponse:
    with get_db() as conn:
        cursor = conn.execute(
            "INSERT INTO users (first_name, last_name, nickname, avatar_filename) "
            "VALUES (?, ?, ?, ?)",
            (body.first_name, body.last_name, body.nickname, body.avatar_filename),
        )
        user_id = _inserted_id(cursor)
        return _require_user(conn, user_id)


@router.post("/get_user", response_model=UserResponse, tags=["users"])
def get_user(body: UserIdRequest) -> UserResponse:
    with get_db() as conn:
        return _require_user(conn, body.id)


@router.post("/users", response_model=list[UserResponse], tags=["users"])
def list_users(_body: UsersListRequest) -> list[UserResponse]:
    with get_db() as conn:
        rows = conn.execute(f"SELECT {USER_SELECT} FROM users ORDER BY id").fetchall()
        return [_row_user(row) for row in rows]


@router.patch("/user", response_model=UserResponse, tags=["users"])
def update_user(body: UserUpdate) -> UserResponse:
    if (
        body.first_name is None
        and body.last_name is None
        and body.nickname is None
        and body.avatar_filename is None
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one user field must be provided",
        )
    with get_db() as conn:
        existing = _require_user(conn, body.id)
        first_name = body.first_name if body.first_name is not None else existing.first_name
        last_name = body.last_name if body.last_name is not None else existing.last_name
        nickname = body.nickname if body.nickname is not None else existing.nickname
        avatar_filename = (
            body.avatar_filename if body.avatar_filename is not None else existing.avatar_filename
        )
        conn.execute(
            "UPDATE users SET first_name = ?, last_name = ?, nickname = ?, avatar_filename = ? "
            "WHERE id = ?",
            (first_name, last_name, nickname, avatar_filename, body.id),
        )
        return _require_user(conn, body.id)


@router.delete("/user", status_code=status.HTTP_204_NO_CONTENT, tags=["users"])
def delete_user(body: UserIdRequest) -> None:
    with get_db() as conn:
        _require_user(conn, body.id)
        conn.execute("DELETE FROM users WHERE id = ?", (body.id,))


@router.post("/drug", response_model=DrugResponse, tags=["drugs"])
def create_drug(body: DrugCreate) -> DrugResponse:
    with get_db() as conn:
        cursor = conn.execute(
            "INSERT INTO drugs (name, description, asset_filename) VALUES (?, ?, ?)",
            (body.name, body.description, body.asset_filename),
        )
        drug_id = _inserted_id(cursor)
        return _require_drug(conn, drug_id)


@router.post("/get_drug", response_model=DrugResponse, tags=["drugs"])
def get_drug(body: DrugIdRequest) -> DrugResponse:
    with get_db() as conn:
        return _require_drug(conn, body.id)


@router.post("/drugs", response_model=list[DrugResponse], tags=["drugs"])
def list_drugs(_body: DrugsListRequest) -> list[DrugResponse]:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT id, name, description, asset_filename FROM drugs ORDER BY id",
        ).fetchall()
        return [_row_drug(row) for row in rows]


@router.patch("/drug", response_model=DrugResponse, tags=["drugs"])
def update_drug(body: DrugUpdate) -> DrugResponse:
    if body.name is None and body.description is None and body.asset_filename is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one field must be provided to update",
        )
    with get_db() as conn:
        existing = _require_drug(conn, body.id)
        name = body.name if body.name is not None else existing.name
        description = body.description if body.description is not None else existing.description
        asset_filename = (
            body.asset_filename if body.asset_filename is not None else existing.asset_filename
        )
        conn.execute(
            "UPDATE drugs SET name = ?, description = ?, asset_filename = ? WHERE id = ?",
            (name, description, asset_filename, body.id),
        )
        return _require_drug(conn, body.id)


@router.delete("/drug", status_code=status.HTTP_204_NO_CONTENT, tags=["drugs"])
def delete_drug(body: DrugIdRequest) -> None:
    with get_db() as conn:
        _require_drug(conn, body.id)
        conn.execute("DELETE FROM drugs WHERE id = ?", (body.id,))


@router.post("/user_drug", response_model=UserDrugResponse, tags=["user_drugs"])
def create_user_drug(body: UserDrugCreate) -> UserDrugResponse:
    with get_db() as conn:
        _require_user(conn, body.user_id)
        _require_drug(conn, body.drug_id)
        conn.execute(
            "INSERT OR IGNORE INTO user_drugs (user_id, drug_id) VALUES (?, ?)",
            (body.user_id, body.drug_id),
        )
        row = conn.execute(
            "SELECT id, user_id, drug_id FROM user_drugs WHERE user_id = ? AND drug_id = ?",
            (body.user_id, body.drug_id),
        ).fetchone()
        assert row is not None
        return _row_user_drug(row)


@router.post("/get_user_drug", response_model=UserDrugResponse, tags=["user_drugs"])
def get_user_drug(body: UserDrugIdRequest) -> UserDrugResponse:
    with get_db() as conn:
        row = conn.execute(
            "SELECT id, user_id, drug_id FROM user_drugs WHERE id = ?",
            (body.id,),
        ).fetchone()
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User-drug link not found",
            )
        return _row_user_drug(row)


@router.post("/user_drugs", response_model=list[UserDrugResponse], tags=["user_drugs"])
def list_user_drugs(body: UserDrugsListRequest) -> list[UserDrugResponse]:
    with get_db() as conn:
        if body.user_id is not None:
            rows = conn.execute(
                "SELECT id, user_id, drug_id FROM user_drugs WHERE user_id = ? ORDER BY id",
                (body.user_id,),
            ).fetchall()
        elif body.drug_id is not None:
            rows = conn.execute(
                "SELECT id, user_id, drug_id FROM user_drugs WHERE drug_id = ? ORDER BY id",
                (body.drug_id,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT id, user_id, drug_id FROM user_drugs ORDER BY id",
            ).fetchall()
        return [_row_user_drug(row) for row in rows]


@router.delete("/user_drug", status_code=status.HTTP_204_NO_CONTENT, tags=["user_drugs"])
def delete_user_drug(body: UserDrugIdRequest) -> None:
    with get_db() as conn:
        row = conn.execute("SELECT id FROM user_drugs WHERE id = ?", (body.id,)).fetchone()
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User-drug link not found",
            )
        conn.execute("DELETE FROM user_drugs WHERE id = ?", (body.id,))


@router.post("/avatar", response_model=AvatarResponse, tags=["avatars"])
def create_avatar(body: AvatarCreate) -> AvatarResponse:
    with get_db() as conn:
        cursor = conn.execute(
            "INSERT INTO avatars (name, filename) VALUES (?, ?)",
            (body.name, body.filename),
        )
        avatar_id = _inserted_id(cursor)
        return _require_avatar(conn, avatar_id)


@router.post("/get_avatar", response_model=AvatarResponse, tags=["avatars"])
def get_avatar(body: AvatarIdRequest) -> AvatarResponse:
    with get_db() as conn:
        return _require_avatar(conn, body.id)


@router.post("/avatars", response_model=list[AvatarResponse], tags=["avatars"])
def list_avatars(_body: AvatarsListRequest) -> list[AvatarResponse]:
    with get_db() as conn:
        rows = conn.execute(f"SELECT {AVATAR_SELECT} FROM avatars ORDER BY id").fetchall()
        return [_row_avatar(row) for row in rows]


@router.patch("/avatar", response_model=AvatarResponse, tags=["avatars"])
def update_avatar(body: AvatarUpdate) -> AvatarResponse:
    if body.name is None and body.filename is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one field must be provided to update",
        )
    with get_db() as conn:
        existing = _require_avatar(conn, body.id)
        name = body.name if body.name is not None else existing.name
        filename = body.filename if body.filename is not None else existing.filename
        conn.execute(
            "UPDATE avatars SET name = ?, filename = ? WHERE id = ?",
            (name, filename, body.id),
        )
        return _require_avatar(conn, body.id)


@router.delete("/avatar", status_code=status.HTTP_204_NO_CONTENT, tags=["avatars"])
def delete_avatar(body: AvatarIdRequest) -> None:
    with get_db() as conn:
        _require_avatar(conn, body.id)
        conn.execute("DELETE FROM avatars WHERE id = ?", (body.id,))


@router.post("/user_avatar", response_model=UserAvatarResponse, tags=["user_avatars"])
def create_user_avatar(body: UserAvatarCreate) -> UserAvatarResponse:
    with get_db() as conn:
        _require_user(conn, body.user_id)
        _require_avatar(conn, body.avatar_id)
        conn.execute(
            "INSERT OR IGNORE INTO user_avatars (user_id, avatar_id) VALUES (?, ?)",
            (body.user_id, body.avatar_id),
        )
        row = conn.execute(
            "SELECT id, user_id, avatar_id FROM user_avatars WHERE user_id = ? AND avatar_id = ?",
            (body.user_id, body.avatar_id),
        ).fetchone()
        assert row is not None
        return _row_user_avatar(row)


@router.post("/get_user_avatar", response_model=UserAvatarResponse, tags=["user_avatars"])
def get_user_avatar(body: UserAvatarIdRequest) -> UserAvatarResponse:
    with get_db() as conn:
        row = conn.execute(
            "SELECT id, user_id, avatar_id FROM user_avatars WHERE id = ?",
            (body.id,),
        ).fetchone()
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User-avatar link not found",
            )
        return _row_user_avatar(row)


@router.post("/user_avatars", response_model=list[UserAvatarResponse], tags=["user_avatars"])
def list_user_avatars(body: UserAvatarsListRequest) -> list[UserAvatarResponse]:
    with get_db() as conn:
        if body.user_id is not None:
            rows = conn.execute(
                "SELECT id, user_id, avatar_id FROM user_avatars WHERE user_id = ? ORDER BY id",
                (body.user_id,),
            ).fetchall()
        elif body.avatar_id is not None:
            rows = conn.execute(
                "SELECT id, user_id, avatar_id FROM user_avatars WHERE avatar_id = ? ORDER BY id",
                (body.avatar_id,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT id, user_id, avatar_id FROM user_avatars ORDER BY id",
            ).fetchall()
        return [_row_user_avatar(row) for row in rows]


@router.delete("/user_avatar", status_code=status.HTTP_204_NO_CONTENT, tags=["user_avatars"])
def delete_user_avatar(body: UserAvatarIdRequest) -> None:
    with get_db() as conn:
        row = conn.execute("SELECT id FROM user_avatars WHERE id = ?", (body.id,)).fetchone()
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User-avatar link not found",
            )
        conn.execute("DELETE FROM user_avatars WHERE id = ?", (body.id,))


app.include_router(router)
