"""Shared, synthetic demo rooms. A room code is a shareable demo capability."""

import secrets
from datetime import UTC, datetime
from typing import Annotated, Literal, cast

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from .database import DatabaseClient, first_row

Medicine = Literal[
    "mercaptopurine",
    "methotrexate",
    "thioguanine",
    "imatinib",
    "dasatinib",
    "temozolomide",
    "cyclophosphamide",
    "etoposide",
    "isotretinoin",
]
Prize = Literal["book", "movie", "toy", "ice-cream", "bakery", "shoes"]
Role = Literal["patient", "medical", "parent"]
RoomCode = Annotated[str, Field(pattern=r"^[A-Z2-9]{8}$")]


class DemoState(BaseModel):
    room: str
    revision: int = 0
    medicines: list[Medicine] = Field(default_factory=list)
    time: str = "09:00"
    prizes: list[Prize] = Field(default_factory=list)
    checked_in: bool = False
    won: bool = False
    won_on: str | None = None
    won_level: int = 1
    claimed: Prize | None = None
    received: bool = False


class CreateRoom(BaseModel):
    pass


class ReadRoom(BaseModel):
    room: RoomCode


class PublishPlan(BaseModel):
    action: Literal["plan"]
    role: Literal["medical"]
    medicines: list[Medicine] = Field(min_length=1, max_length=3)
    time: str = Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")


class ChoosePrizes(BaseModel):
    action: Literal["prizes"]
    role: Literal["parent"]
    prizes: list[Prize] = Field(min_length=1, max_length=6)


class PatientAction(BaseModel):
    action: Literal["check-in", "win"]
    role: Literal["patient"]
    level: int = Field(default=1, ge=1, le=1000000)


class ClaimPrize(BaseModel):
    action: Literal["claim"]
    role: Literal["patient"]
    prize: Prize


class ReceivePrize(BaseModel):
    action: Literal["receive"]
    role: Literal["parent"]


Command = Annotated[
    PublishPlan | ChoosePrizes | PatientAction | ClaimPrize | ReceivePrize,
    Field(discriminator="action"),
]


class UpdateRoom(BaseModel):
    room: RoomCode
    revision: int = Field(ge=0)
    command: Command


async def demo_db(request: Request) -> DatabaseClient:
    return cast(DatabaseClient, request.app.state.db)


Db = Annotated[DatabaseClient, Depends(demo_db)]
router = APIRouter(prefix="/api/demo", tags=["demo"])


async def read_room(db: DatabaseClient, room: str) -> DemoState:
    result = await db.execute(
        "SELECT state FROM demo_rooms WHERE code = ? AND expires_at > unixepoch()", [room]
    )
    row = first_row(result)
    if row is None:
        raise HTTPException(404, "Demo room not found or expired. Create a new room.")
    return DemoState.model_validate_json(str(row["state"]))


@router.post("/create")
async def create_room(_body: CreateRoom, db: Db) -> DemoState:
    for _ in range(5):
        code = "".join(secrets.choice("ABCDEFGHJKLMNPQRSTUVWXYZ23456789") for _ in range(8))
        state = DemoState(room=code)
        result = await db.execute(
            "INSERT OR IGNORE INTO demo_rooms (code, state, revision, expires_at) "
            "VALUES (?, ?, 0, unixepoch() + 604800) RETURNING code",
            [code, state.model_dump_json()],
        )
        if result.rows:
            return state
    raise HTTPException(503, "Could not create a room. Please try again.")


@router.post("/read")
async def get_room(body: ReadRoom, db: Db) -> DemoState:
    return await read_room(db, body.room)


@router.post("/update")
async def update_room(body: UpdateRoom, db: Db) -> DemoState:
    state = await read_room(db, body.room)
    if state.revision != body.revision:
        raise HTTPException(409, "The demo changed on another device. Review it and try again.")
    command = body.command
    if isinstance(command, PublishPlan):
        state.medicines = list(dict.fromkeys(command.medicines))
        state.time = command.time
    elif isinstance(command, ChoosePrizes):
        state.prizes = list(dict.fromkeys(command.prizes))
    elif isinstance(command, PatientAction):
        if not state.medicines:
            raise HTTPException(409, "Wait for the medical team to publish a sample plan.")
        if command.action == "check-in":
            state.checked_in = True
        elif not state.checked_in:
            raise HTTPException(409, "Check in before playing the demo round.")
        else:
            if not state.won:
                state.won_on = datetime.now(UTC).date().isoformat()
                state.won_level = command.level
            state.won = True
    elif isinstance(command, ClaimPrize):
        if not state.won or state.claimed is not None or command.prize not in state.prizes:
            raise HTTPException(409, "That reward is not available to claim.")
        state.claimed = command.prize
    elif isinstance(command, ReceivePrize):
        if state.claimed is None:
            raise HTTPException(409, "The patient has not claimed a reward yet.")
        state.received = True

    state.revision += 1
    result = await db.execute(
        "UPDATE demo_rooms SET state = ?, revision = ? "
        "WHERE code = ? AND revision = ? AND expires_at > unixepoch() RETURNING code",
        [state.model_dump_json(), state.revision, body.room, body.revision],
    )
    if not result.rows:
        raise HTTPException(409, "The demo changed on another device. Review it and try again.")
    return state
