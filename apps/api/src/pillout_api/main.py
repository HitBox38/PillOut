"""ASGI application entry point, independent of any hosting provider."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Annotated, Literal, cast

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request, status
from pydantic import BaseModel, Field

from .database import (
    DatabaseClient,
    ResultSet,
    RowDict,
    cell_int,
    create_db_client,
    first_row,
    init_schema,
    inserted_row_id,
    row_dicts,
)
from .demo import router as demo_router


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: Literal["pillout-api"] = "pillout-api"


# --- Users ---


class UserCreate(BaseModel):
    first_name: str = Field(min_length=1, max_length=200)
    last_name: str = Field(min_length=1, max_length=200)
    nickname: str | None = Field(default=None, max_length=100)
    avatar_filename: str | None = Field(default=None, max_length=500)
    avatar_id: int | None = Field(default=None, ge=1)


class UserUpdate(BaseModel):
    id: int = Field(ge=1)
    first_name: str | None = Field(default=None, min_length=1, max_length=200)
    last_name: str | None = Field(default=None, min_length=1, max_length=200)
    nickname: str | None = Field(default=None, max_length=100)
    avatar_filename: str | None = Field(default=None, max_length=500)
    avatar_id: int | None = Field(default=None, ge=1)


class UserIdRequest(BaseModel):
    id: int = Field(ge=1)


class UserResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    nickname: str | None
    avatar_filename: str | None
    avatar_id: int | None


class UsersListRequest(BaseModel):
    pass


class PatientSearchRequest(BaseModel):
    query: str = Field(min_length=2, max_length=100)
    page: int = Field(default=0, ge=0, le=10000)


class PatientSearchItem(BaseModel):
    id: int
    name: str


class PatientSearchResponse(BaseModel):
    items: list[PatientSearchItem]
    has_more: bool


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
    catalog_key: str | None


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
    catalog_key: str | None


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


USER_SELECT = "id, first_name, last_name, nickname, avatar_filename, avatar_id"
AVATAR_SELECT = "id, name, filename, catalog_key"
DRUG_SELECT = "id, name, description, asset_filename, catalog_key"


def _optional_text(value: object | None) -> str | None:
    return None if value is None else str(value)


def _row_user(row: RowDict) -> UserResponse:
    return UserResponse(
        id=cell_int(row["id"]),
        first_name=str(row["first_name"]),
        last_name=str(row["last_name"]),
        nickname=_optional_text(row.get("nickname")),
        avatar_filename=_optional_text(row.get("avatar_filename")),
        avatar_id=cell_int(row["avatar_id"]) if row.get("avatar_id") is not None else None,
    )


def _row_drug(row: RowDict) -> DrugResponse:
    return DrugResponse(
        id=cell_int(row["id"]),
        name=str(row["name"]),
        description=str(row["description"]),
        asset_filename=str(row["asset_filename"]),
        catalog_key=_optional_text(row.get("catalog_key")),
    )


def _row_user_drug(row: RowDict) -> UserDrugResponse:
    return UserDrugResponse(
        id=cell_int(row["id"]),
        user_id=cell_int(row["user_id"]),
        drug_id=cell_int(row["drug_id"]),
    )


def _row_avatar(row: RowDict) -> AvatarResponse:
    return AvatarResponse(
        id=cell_int(row["id"]),
        name=str(row["name"]),
        filename=str(row["filename"]),
        catalog_key=_optional_text(row.get("catalog_key")),
    )


def _row_user_avatar(row: RowDict) -> UserAvatarResponse:
    return UserAvatarResponse(
        id=cell_int(row["id"]),
        user_id=cell_int(row["user_id"]),
        avatar_id=cell_int(row["avatar_id"]),
    )


async def _require_user(db: DatabaseClient, user_id: int) -> UserResponse:
    result = await db.execute(
        f"SELECT {USER_SELECT} FROM users WHERE id = ?",
        [user_id],
    )
    row = first_row(result)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return _row_user(row)


async def _require_drug(db: DatabaseClient, drug_id: int) -> DrugResponse:
    result = await db.execute(
        f"SELECT {DRUG_SELECT} FROM drugs WHERE id = ?",
        [drug_id],
    )
    row = first_row(result)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Drug not found")
    return _row_drug(row)


async def _require_avatar(db: DatabaseClient, avatar_id: int) -> AvatarResponse:
    result = await db.execute(
        f"SELECT {AVATAR_SELECT} FROM avatars WHERE id = ?",
        [avatar_id],
    )
    row = first_row(result)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Avatar not found")
    return _row_avatar(row)


def _inserted_id(result: ResultSet) -> int:
    try:
        return inserted_row_id(result)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Insert did not return a row id",
        ) from None


async def get_db(request: Request) -> DatabaseClient:
    return cast(DatabaseClient, request.app.state.db)


DbDep = Annotated[DatabaseClient, Depends(get_db)]


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    app.state.db = create_db_client()
    try:
        await init_schema(app.state.db)
        yield
    finally:
        await app.state.db.close()


app = FastAPI(title="Pillout API", version="0.1.0", lifespan=lifespan)
router = APIRouter(prefix="/api")


@router.get("/health", response_model=HealthResponse, tags=["health"])
def health() -> HealthResponse:
    """Report that the API is serving requests."""
    return HealthResponse()


@router.post("/user", response_model=UserResponse, tags=["users"])
async def create_user(body: UserCreate, db: DbDep) -> UserResponse:
    avatar_filename = body.avatar_filename
    if body.avatar_id is not None:
        avatar_filename = (await _require_avatar(db, body.avatar_id)).filename
    result = await db.execute(
        "INSERT INTO users (first_name, last_name, nickname, avatar_filename, avatar_id) "
        "VALUES (?, ?, ?, ?, ?)",
        [body.first_name, body.last_name, body.nickname, avatar_filename, body.avatar_id],
    )
    user_id = _inserted_id(result)
    return await _require_user(db, user_id)


@router.post("/patients/search", tags=["users"])
async def search_patients(body: PatientSearchRequest, db: DbDep) -> PatientSearchResponse:
    query = " ".join(body.query.split())
    if len(query) < 2:
        raise HTTPException(422, "Enter at least two characters of the patient's name.")
    escaped = query.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    result = await db.execute(
        "SELECT id, first_name, last_name FROM users "
        "WHERE (first_name || ' ' || last_name) LIKE ? ESCAPE '\\' COLLATE NOCASE "
        "ORDER BY first_name COLLATE NOCASE, last_name COLLATE NOCASE, id LIMIT 4 OFFSET ?",
        [f"%{escaped}%", body.page * 3],
    )
    rows = row_dicts(result)
    return PatientSearchResponse(
        items=[
            PatientSearchItem(
                id=cell_int(row["id"]), name=f"{row['first_name']} {row['last_name']}"
            )
            for row in rows[:3]
        ],
        has_more=len(rows) > 3,
    )


@router.post("/get_user", response_model=UserResponse, tags=["users"])
async def get_user(body: UserIdRequest, db: DbDep) -> UserResponse:
    return await _require_user(db, body.id)


@router.post("/users", response_model=list[UserResponse], tags=["users"])
async def list_users(_body: UsersListRequest, db: DbDep) -> list[UserResponse]:
    result = await db.execute(f"SELECT {USER_SELECT} FROM users ORDER BY id")
    return [_row_user(row) for row in row_dicts(result)]


@router.patch("/user", response_model=UserResponse, tags=["users"])
async def update_user(body: UserUpdate, db: DbDep) -> UserResponse:
    if (
        body.first_name is None
        and body.last_name is None
        and body.nickname is None
        and body.avatar_filename is None
        and "avatar_id" not in body.model_fields_set
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one user field must be provided",
        )
    existing = await _require_user(db, body.id)
    first_name = body.first_name if body.first_name is not None else existing.first_name
    last_name = body.last_name if body.last_name is not None else existing.last_name
    nickname = body.nickname if body.nickname is not None else existing.nickname
    avatar_filename = (
        body.avatar_filename if body.avatar_filename is not None else existing.avatar_filename
    )
    avatar_id = existing.avatar_id
    if "avatar_id" in body.model_fields_set:
        avatar_id = body.avatar_id
        avatar_filename = (
            (await _require_avatar(db, avatar_id)).filename if avatar_id is not None else None
        )
    elif body.avatar_filename is not None:
        avatar_id = None
    await db.execute(
        "UPDATE users SET first_name = ?, last_name = ?, nickname = ?, avatar_filename = ?, "
        "avatar_id = ? "
        "WHERE id = ?",
        [first_name, last_name, nickname, avatar_filename, avatar_id, body.id],
    )
    return await _require_user(db, body.id)


@router.delete("/user", status_code=status.HTTP_204_NO_CONTENT, tags=["users"])
async def delete_user(body: UserIdRequest, db: DbDep) -> None:
    await _require_user(db, body.id)
    await db.execute("DELETE FROM users WHERE id = ?", [body.id])


@router.post("/drug", response_model=DrugResponse, tags=["drugs"])
async def create_drug(body: DrugCreate, db: DbDep) -> DrugResponse:
    result = await db.execute(
        "INSERT INTO drugs (name, description, asset_filename) VALUES (?, ?, ?)",
        [body.name, body.description, body.asset_filename],
    )
    drug_id = _inserted_id(result)
    return await _require_drug(db, drug_id)


@router.post("/get_drug", response_model=DrugResponse, tags=["drugs"])
async def get_drug(body: DrugIdRequest, db: DbDep) -> DrugResponse:
    return await _require_drug(db, body.id)


@router.post("/drugs", response_model=list[DrugResponse], tags=["drugs"])
async def list_drugs(_body: DrugsListRequest, db: DbDep) -> list[DrugResponse]:
    result = await db.execute(
        f"SELECT {DRUG_SELECT} FROM drugs ORDER BY id",
    )
    return [_row_drug(row) for row in row_dicts(result)]


@router.patch("/drug", response_model=DrugResponse, tags=["drugs"])
async def update_drug(body: DrugUpdate, db: DbDep) -> DrugResponse:
    if body.name is None and body.description is None and body.asset_filename is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one field must be provided to update",
        )
    existing = await _require_drug(db, body.id)
    name = body.name if body.name is not None else existing.name
    description = body.description if body.description is not None else existing.description
    asset_filename = (
        body.asset_filename if body.asset_filename is not None else existing.asset_filename
    )
    await db.execute(
        "UPDATE drugs SET name = ?, description = ?, asset_filename = ? WHERE id = ?",
        [name, description, asset_filename, body.id],
    )
    return await _require_drug(db, body.id)


@router.delete("/drug", status_code=status.HTTP_204_NO_CONTENT, tags=["drugs"])
async def delete_drug(body: DrugIdRequest, db: DbDep) -> None:
    await _require_drug(db, body.id)
    await db.execute("DELETE FROM drugs WHERE id = ?", [body.id])


@router.post("/user_drug", response_model=UserDrugResponse, tags=["user_drugs"])
async def create_user_drug(body: UserDrugCreate, db: DbDep) -> UserDrugResponse:
    await _require_user(db, body.user_id)
    await _require_drug(db, body.drug_id)
    await db.execute(
        "INSERT OR IGNORE INTO user_drugs (user_id, drug_id) VALUES (?, ?)",
        [body.user_id, body.drug_id],
    )
    result = await db.execute(
        "SELECT id, user_id, drug_id FROM user_drugs WHERE user_id = ? AND drug_id = ?",
        [body.user_id, body.drug_id],
    )
    row = first_row(result)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load user-drug link",
        )
    return _row_user_drug(row)


@router.post("/get_user_drug", response_model=UserDrugResponse, tags=["user_drugs"])
async def get_user_drug(body: UserDrugIdRequest, db: DbDep) -> UserDrugResponse:
    result = await db.execute(
        "SELECT id, user_id, drug_id FROM user_drugs WHERE id = ?",
        [body.id],
    )
    row = first_row(result)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User-drug link not found",
        )
    return _row_user_drug(row)


@router.post("/user_drugs", response_model=list[UserDrugResponse], tags=["user_drugs"])
async def list_user_drugs(body: UserDrugsListRequest, db: DbDep) -> list[UserDrugResponse]:
    if body.user_id is not None:
        result = await db.execute(
            "SELECT id, user_id, drug_id FROM user_drugs WHERE user_id = ? ORDER BY id",
            [body.user_id],
        )
    elif body.drug_id is not None:
        result = await db.execute(
            "SELECT id, user_id, drug_id FROM user_drugs WHERE drug_id = ? ORDER BY id",
            [body.drug_id],
        )
    else:
        result = await db.execute("SELECT id, user_id, drug_id FROM user_drugs ORDER BY id")
    return [_row_user_drug(row) for row in row_dicts(result)]


@router.delete("/user_drug", status_code=status.HTTP_204_NO_CONTENT, tags=["user_drugs"])
async def delete_user_drug(body: UserDrugIdRequest, db: DbDep) -> None:
    result = await db.execute("SELECT id FROM user_drugs WHERE id = ?", [body.id])
    if first_row(result) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User-drug link not found",
        )
    await db.execute("DELETE FROM user_drugs WHERE id = ?", [body.id])


@router.post("/avatar", response_model=AvatarResponse, tags=["avatars"])
async def create_avatar(body: AvatarCreate, db: DbDep) -> AvatarResponse:
    result = await db.execute(
        "INSERT INTO avatars (name, filename) VALUES (?, ?)",
        [body.name, body.filename],
    )
    avatar_id = _inserted_id(result)
    return await _require_avatar(db, avatar_id)


@router.post("/get_avatar", response_model=AvatarResponse, tags=["avatars"])
async def get_avatar(body: AvatarIdRequest, db: DbDep) -> AvatarResponse:
    return await _require_avatar(db, body.id)


@router.post("/avatars", response_model=list[AvatarResponse], tags=["avatars"])
async def list_avatars(_body: AvatarsListRequest, db: DbDep) -> list[AvatarResponse]:
    result = await db.execute(f"SELECT {AVATAR_SELECT} FROM avatars ORDER BY id")
    return [_row_avatar(row) for row in row_dicts(result)]


@router.patch("/avatar", response_model=AvatarResponse, tags=["avatars"])
async def update_avatar(body: AvatarUpdate, db: DbDep) -> AvatarResponse:
    if body.name is None and body.filename is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one field must be provided to update",
        )
    existing = await _require_avatar(db, body.id)
    name = body.name if body.name is not None else existing.name
    filename = body.filename if body.filename is not None else existing.filename
    await db.execute(
        "UPDATE avatars SET name = ?, filename = ? WHERE id = ?",
        [name, filename, body.id],
    )
    return await _require_avatar(db, body.id)


@router.delete("/avatar", status_code=status.HTTP_204_NO_CONTENT, tags=["avatars"])
async def delete_avatar(body: AvatarIdRequest, db: DbDep) -> None:
    await _require_avatar(db, body.id)
    await db.execute("DELETE FROM avatars WHERE id = ?", [body.id])


@router.post("/user_avatar", response_model=UserAvatarResponse, tags=["user_avatars"])
async def create_user_avatar(body: UserAvatarCreate, db: DbDep) -> UserAvatarResponse:
    await _require_user(db, body.user_id)
    await _require_avatar(db, body.avatar_id)
    await db.execute(
        "INSERT OR IGNORE INTO user_avatars (user_id, avatar_id) VALUES (?, ?)",
        [body.user_id, body.avatar_id],
    )
    result = await db.execute(
        "SELECT id, user_id, avatar_id FROM user_avatars WHERE user_id = ? AND avatar_id = ?",
        [body.user_id, body.avatar_id],
    )
    row = first_row(result)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load user-avatar link",
        )
    return _row_user_avatar(row)


@router.post("/get_user_avatar", response_model=UserAvatarResponse, tags=["user_avatars"])
async def get_user_avatar(body: UserAvatarIdRequest, db: DbDep) -> UserAvatarResponse:
    result = await db.execute(
        "SELECT id, user_id, avatar_id FROM user_avatars WHERE id = ?",
        [body.id],
    )
    row = first_row(result)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User-avatar link not found",
        )
    return _row_user_avatar(row)


@router.post("/user_avatars", response_model=list[UserAvatarResponse], tags=["user_avatars"])
async def list_user_avatars(body: UserAvatarsListRequest, db: DbDep) -> list[UserAvatarResponse]:
    if body.user_id is not None:
        result = await db.execute(
            "SELECT id, user_id, avatar_id FROM user_avatars WHERE user_id = ? ORDER BY id",
            [body.user_id],
        )
    elif body.avatar_id is not None:
        result = await db.execute(
            "SELECT id, user_id, avatar_id FROM user_avatars WHERE avatar_id = ? ORDER BY id",
            [body.avatar_id],
        )
    else:
        result = await db.execute("SELECT id, user_id, avatar_id FROM user_avatars ORDER BY id")
    return [_row_user_avatar(row) for row in row_dicts(result)]


@router.delete("/user_avatar", status_code=status.HTTP_204_NO_CONTENT, tags=["user_avatars"])
async def delete_user_avatar(body: UserAvatarIdRequest, db: DbDep) -> None:
    result = await db.execute("SELECT id FROM user_avatars WHERE id = ?", [body.id])
    if first_row(result) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User-avatar link not found",
        )
    await db.execute("DELETE FROM user_avatars WHERE id = ?", [body.id])


app.include_router(router)
app.include_router(demo_router)
