import sqlite3
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from pillout_api.main import app


@pytest.fixture
def database_path(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    path = tmp_path / "demo.db"
    monkeypatch.setenv("TURSO_DATABASE_URL", path.as_uri())
    monkeypatch.setenv("TURSO_AUTH_TOKEN", "")
    return path


@pytest.fixture
def client(database_path: Path) -> Iterator[TestClient]:
    with TestClient(app) as client:
        yield client


def update(client: TestClient, room: dict[str, Any], **command: object) -> dict[str, Any]:
    response = client.post(
        "/api/demo/update",
        json={"room": room["room"], "revision": room["revision"], "command": command},
    )
    assert response.status_code == 200, response.text
    return dict(response.json())


def test_live_flow_is_shared_and_survives_restart(database_path: Path) -> None:
    with TestClient(app) as client:
        room = client.post("/api/demo/create", json={}).json()
        room = update(
            client, room, action="plan", role="medical", medicines=["imatinib"], time="10:30"
        )
        room = update(client, room, action="prizes", role="parent", prizes=["book", "toy"])
        room = update(client, room, action="check-in", role="patient")
        room = update(client, room, action="win", role="patient")
        room = update(client, room, action="claim", role="patient", prize="book")
        # Changing choices must preserve the already claimed reward.
        room = update(client, room, action="prizes", role="parent", prizes=["movie"])
        room = update(client, room, action="receive", role="parent")
        assert room["claimed"] == "book"
        assert room["received"] is True
        assert client.post("/api/users", json={}).json() == []

    with TestClient(app) as another_device:
        assert another_device.post("/api/demo/read", json={"room": room["room"]}).json() == room


def test_concurrent_devices_cannot_overwrite_each_other(client: TestClient) -> None:
    original = client.post("/api/demo/create", json={}).json()
    latest = update(client, original, action="prizes", role="parent", prizes=["toy"])
    stale = client.post(
        "/api/demo/update",
        json={
            "room": original["room"],
            "revision": original["revision"],
            "command": {
                "action": "plan",
                "role": "medical",
                "medicines": ["imatinib"],
                "time": "09:00",
            },
        },
    )
    assert stale.status_code == 409
    latest = update(
        client, latest, action="plan", role="medical", medicines=["imatinib"], time="09:00"
    )
    assert latest["prizes"] == ["toy"]
    other_room = client.post("/api/demo/create", json={}).json()
    assert other_room["prizes"] == []
    assert other_room["room"] != latest["room"]


def test_actions_require_the_correct_role_and_flow_state(client: TestClient) -> None:
    room = client.post("/api/demo/create", json={}).json()
    for command, status in [
        ({"action": "win", "role": "patient"}, 409),
        ({"action": "receive", "role": "parent"}, 409),
        ({"action": "claim", "role": "patient", "prize": "toy"}, 409),
        ({"action": "plan", "role": "patient", "medicines": ["imatinib"], "time": "09:00"}, 422),
        ({"action": "plan", "role": "medical", "medicines": ["unknown"], "time": "09:00"}, 422),
        ({"action": "plan", "role": "medical", "medicines": ["imatinib"], "time": "29:00"}, 422),
        ({"action": "prizes", "role": "parent", "prizes": []}, 422),
    ]:
        response = client.post(
            "/api/demo/update",
            json={
                "room": room["room"],
                "revision": room["revision"],
                "command": command,
            },
        )
        assert response.status_code == status
    room = update(client, room, action="plan", role="medical", medicines=["imatinib"], time="09:00")
    assert (
        client.post(
            "/api/demo/update",
            json={
                "room": room["room"],
                "revision": room["revision"],
                "command": {"action": "win", "role": "patient"},
            },
        ).status_code
        == 409
    )


def test_expired_rooms_cannot_be_read_or_changed(client: TestClient, database_path: Path) -> None:
    room = client.post("/api/demo/create", json={}).json()
    with sqlite3.connect(database_path) as db:
        db.execute("UPDATE demo_rooms SET expires_at = 0")
    assert client.post("/api/demo/read", json={"room": room["room"]}).status_code == 404
    assert (
        client.post(
            "/api/demo/update",
            json={
                "room": room["room"],
                "revision": 0,
                "command": {"action": "prizes", "role": "parent", "prizes": ["toy"]},
            },
        ).status_code
        == 404
    )
