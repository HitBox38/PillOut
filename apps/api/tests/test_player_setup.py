import sqlite3
from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from pillout_api.catalog import AVATARS, MEDICINES
from pillout_api.database import SCHEMA_PATH
from pillout_api.main import app


@pytest.fixture
def database_path(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    path = tmp_path / "pillout.db"
    monkeypatch.setenv("TURSO_DATABASE_URL", path.as_uri())
    monkeypatch.setenv("TURSO_AUTH_TOKEN", "")
    return path


@pytest.fixture
def client(database_path: Path) -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


def test_catalog_keys_survive_restart(database_path: Path) -> None:
    with TestClient(app) as client:
        drugs = client.post("/api/drugs", json={}).json()
        avatars = client.post("/api/avatars", json={}).json()

    assert {row["catalog_key"] for row in drugs} == {key for key, _ in MEDICINES}
    assert {row["catalog_key"] for row in avatars} == {key for key, _ in AVATARS}
    with TestClient(app) as client:
        assert client.post("/api/drugs", json={}).json() == drugs
        assert client.post("/api/avatars", json={}).json() == avatars


def test_profile_and_selected_avatar_persist(database_path: Path) -> None:
    with TestClient(app) as client:
        avatars = client.post("/api/avatars", json={}).json()
        fox = next(row for row in avatars if row["catalog_key"] == "fox")
        response = client.post(
            "/api/user",
            json={
                "first_name": "Ariel",
                "last_name": "Levi",
                "nickname": "Super Ariel",
                "avatar_id": fox["id"],
            },
        )
        assert response.status_code == 200
        user = response.json()
        assert user["avatar_id"] == fox["id"]
        assert user["avatar_filename"] == fox["filename"]

    with TestClient(app) as client:
        assert client.post("/api/get_user", json={"id": user["id"]}).json() == user
        cat = next(row for row in avatars if row["catalog_key"] == "cat")
        updated = client.patch(
            "/api/user", json={"id": user["id"], "nickname": "New nickname", "avatar_id": cat["id"]}
        )
        assert updated.status_code == 200
        assert updated.json()["avatar_id"] == cat["id"]
        assert updated.json()["first_name"] == "Ariel"
        assert len(client.post("/api/users", json={}).json()) == 1


def test_missing_avatar_does_not_create_user(client: TestClient) -> None:
    response = client.post(
        "/api/user", json={"first_name": "Ariel", "last_name": "Levi", "avatar_id": 99999}
    )
    assert response.status_code == 404
    assert client.post("/api/users", json={}).json() == []


def test_patient_name_search_is_paginated_and_matches_full_names(client: TestClient) -> None:
    for first_name, last_name in [
        ("Ariel", "Levi"),
        ("Noa", "Cohen"),
        ("Noa", "Cohen"),
        ("Noam", "Cohen"),
        ("Noa", "Levi"),
        ("Percent%", "Test"),
    ]:
        assert (
            client.post(
                "/api/user",
                json={
                    "first_name": first_name,
                    "last_name": last_name,
                },
            ).status_code
            == 200
        )
    first = client.post("/api/patients/search", json={"query": "noa"}).json()
    assert len(first["items"]) == 3
    assert first["has_more"] is True
    second = client.post("/api/patients/search", json={"query": "NOA", "page": 1}).json()
    assert len(second["items"]) == 1
    assert second["has_more"] is False
    assert {row["id"] for row in first["items"]}.isdisjoint(row["id"] for row in second["items"])
    full = client.post("/api/patients/search", json={"query": "ariel   levi"}).json()
    assert full["items"] == [{"id": 1, "name": "Ariel Levi"}]
    assert client.post("/api/patients/search", json={"query": "missing"}).json()["items"] == []
    assert client.post("/api/patients/search", json={"query": "%_"}).json()["items"] == []
    assert client.post("/api/patients/search", json={"query": "   "}).status_code == 422


def test_avatar_updates_preserve_legacy_filename_support(client: TestClient) -> None:
    user = client.post(
        "/api/user", json={"first_name": "Ariel", "last_name": "Levi", "avatar_id": 1}
    ).json()
    updated = client.patch("/api/user", json={"id": user["id"], "nickname": "A"}).json()
    assert updated["avatar_id"] == 1
    updated = client.patch(
        "/api/user", json={"id": user["id"], "avatar_filename": "legacy.png"}
    ).json()
    assert updated["avatar_id"] is None
    assert updated["avatar_filename"] == "legacy.png"
    cleared = client.patch("/api/user", json={"id": user["id"], "avatar_id": None}).json()
    assert cleared["avatar_filename"] is None


def test_existing_database_is_upgraded_without_losing_rows(database_path: Path) -> None:
    legacy_schema = (
        SCHEMA_PATH.read_text()
        .replace(",\n    avatar_id INTEGER REFERENCES avatars (id) ON DELETE SET NULL", "")
        .replace(",\n    catalog_key TEXT", "")
    )
    with sqlite3.connect(database_path) as db:
        db.executescript(legacy_schema)
        db.execute(
            "INSERT INTO users (first_name, last_name, avatar_filename) VALUES (?, ?, ?)",
            ["Existing", "Player", "old.png"],
        )
        db.execute("INSERT INTO drugs (name, asset_filename) VALUES ('Custom', 'custom.png')")

    with TestClient(app) as client:
        user = client.post("/api/get_user", json={"id": 1}).json()
        assert user["first_name"] == "Existing"
        assert user["avatar_id"] is None
        assert user["avatar_filename"] == "old.png"
        drugs = client.post("/api/drugs", json={}).json()
        assert drugs[0]["name"] == "Custom"
        assert drugs[0]["catalog_key"] is None
        assert len(drugs) == len(MEDICINES) + 1
