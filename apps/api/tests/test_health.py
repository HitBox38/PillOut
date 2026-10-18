from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from pillout_api.main import app


def test_health_endpoint(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("TURSO_DATABASE_URL", (tmp_path / "pillout.db").as_uri())
    monkeypatch.setenv("TURSO_AUTH_TOKEN", "")

    with TestClient(app) as client:
        response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "pillout-api"}
