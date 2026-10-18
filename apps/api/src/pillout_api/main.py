"""ASGI application entry point, independent of any hosting provider."""

from typing import Literal

from fastapi import APIRouter, FastAPI
from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: Literal["pillout-api"] = "pillout-api"


app = FastAPI(title="Pillout API", version="0.1.0")
router = APIRouter(prefix="/api")


@router.get("/health", response_model=HealthResponse, tags=["health"])
def health() -> HealthResponse:
    """Report that the API is serving requests."""
    return HealthResponse()


app.include_router(router)
