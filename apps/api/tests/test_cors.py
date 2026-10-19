import pytest
from fastapi.testclient import TestClient

from pillout_api.main import create_app


@pytest.mark.parametrize("method", ["POST", "PATCH"])
def test_allowed_frontend_can_preflight_json_requests(
    monkeypatch: pytest.MonkeyPatch, method: str
) -> None:
    monkeypatch.setenv(
        "CORS_ALLOWED_ORIGINS", " https://html-classic.itch.zone, https://other.example "
    )
    client = TestClient(create_app())
    response = client.options(
        "/api/user",
        headers={
            "Origin": "https://html-classic.itch.zone",
            "Access-Control-Request-Method": method,
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "https://html-classic.itch.zone"
    assert "access-control-allow-credentials" not in response.headers
    response = client.get("/api/health", headers={"Origin": "https://html-classic.itch.zone"})
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "https://html-classic.itch.zone"


@pytest.mark.parametrize("configured_origins", ["", "https://html-classic.itch.zone"])
def test_other_origins_are_not_allowed(
    monkeypatch: pytest.MonkeyPatch, configured_origins: str
) -> None:
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", configured_origins)
    response = TestClient(create_app()).options(
        "/api/user",
        headers={
            "Origin": "https://unrelated.example",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert "access-control-allow-origin" not in response.headers
