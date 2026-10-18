import asyncio
import json
import multiprocessing
from collections.abc import Iterator
from http.server import BaseHTTPRequestHandler, HTTPServer
from multiprocessing.connection import Connection
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from pillout_api.database import create_db_client
from pillout_api.main import app


def _serve_turso_http(pipe: Connection) -> None:
    """Model the HTTP-only Turso boundary, independently of the client SDK."""

    class Handler(BaseHTTPRequestHandler):
        def do_POST(self) -> None:
            if self.path not in {"/v2/pipeline", "/v3/pipeline", "/v3/cursor"}:
                self.send_error(404, f"Unsupported transport: {self.path}")
                return
            if self.headers.get("Authorization") != "Bearer test-token":
                self.send_error(401)
                return
            request = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
            if self.path == "/v3/cursor":
                assert (
                    request["batch"]["steps"][0]["stmt"]["sql"].rstrip(";") == "SELECT 1 AS value"
                )
                entries = [
                    {"baton": None, "base_url": None},
                    {
                        "type": "step_begin",
                        "step": 0,
                        "cols": [{"name": "value", "decltype": "INTEGER"}],
                    },
                    {"type": "row", "row": [{"type": "integer", "value": "1"}]},
                    {"type": "step_end", "affected_row_count": 0, "last_insert_rowid": None},
                ]
                self._respond("".join(json.dumps(entry) + "\n" for entry in entries).encode())
                return
            results = []
            for operation in request["requests"]:
                if operation["type"] == "describe":
                    response = {
                        "type": "describe",
                        "result": {
                            "params": [],
                            "cols": [{"name": "value", "decltype": "INTEGER"}],
                            "is_explain": False,
                            "is_readonly": True,
                        },
                    }
                elif operation["type"] == "execute":
                    assert operation["stmt"]["sql"] == "SELECT 1 AS value"
                    response = {
                        "type": "execute",
                        "result": {
                            "cols": [{"name": "value", "decltype": "INTEGER"}],
                            "rows": [[{"type": "integer", "value": "1"}]],
                            "affected_row_count": 0,
                            "last_insert_rowid": None,
                        },
                    }
                else:
                    assert operation["type"] == "close", operation
                    response = {"type": "close"}
                results.append({"type": "ok", "response": response})
            body = json.dumps({"baton": None, "base_url": None, "results": results}).encode()
            self._respond(body)

        def _respond(self, body: bytes) -> None:
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, format: str, *args: object) -> None:
            pass

    with HTTPServer(("127.0.0.1", 0), Handler) as server:
        pipe.send(server.server_port)
        pipe.close()
        server.serve_forever()


@pytest.fixture
def turso_http_url() -> Iterator[str]:
    context = multiprocessing.get_context("spawn")
    receive, send = context.Pipe(duplex=False)
    process = context.Process(target=_serve_turso_http, args=(send,))
    process.start()
    send.close()
    try:
        assert receive.poll(10), "Turso HTTP test server did not start"
        yield f"http://127.0.0.1:{receive.recv()}"
    finally:
        receive.close()
        process.terminate()
        process.join(timeout=5)
        if process.is_alive():
            process.kill()
            process.join()


def test_remote_queries_use_supported_http_transport(
    turso_http_url: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("TURSO_DATABASE_URL", turso_http_url)
    monkeypatch.setenv("TURSO_AUTH_TOKEN", "test-token")

    async def query() -> None:
        db = create_db_client()
        try:
            result = await db.execute("SELECT 1 AS value")
            assert result.columns == ("value",)
            assert result.rows[0][0] == 1
        finally:
            await db.close()

    asyncio.run(query())


def test_database_writes_persist_and_foreign_keys_cascade(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("TURSO_DATABASE_URL", (tmp_path / "pillout.db").as_uri())
    monkeypatch.setenv("TURSO_AUTH_TOKEN", "")

    with TestClient(app) as client:
        user = client.post("/api/user", json={"first_name": "Test", "last_name": "Player"})
        assert user.status_code == 200
        user_id = user.json()["id"]
        drug = client.post("/api/drug", json={"name": "Test", "asset_filename": "test.png"})
        assert drug.status_code == 200
        link = client.post(
            "/api/user_drug", json={"user_id": user_id, "drug_id": drug.json()["id"]}
        )
        assert link.status_code == 200

    with TestClient(app) as client:
        user = client.post("/api/get_user", json={"id": user_id})
        assert user.status_code == 200
        assert user.json()["first_name"] == "Test"
        deleted = client.request("DELETE", "/api/user", json={"id": user_id})
        assert deleted.status_code == 204
        links = client.post("/api/user_drugs", json={"user_id": user_id})
        assert links.status_code == 200
        assert links.json() == []
