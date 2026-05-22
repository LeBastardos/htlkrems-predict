from fastapi import APIRouter

from app.api.endpoints import auth, bet, wallet, users, markets
from app.api import websocket

api_router = APIRouter()

api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["Authentifizierung"],
)

api_router.include_router(
    bet.router,
    prefix="/bet",
    tags=["Wetten & Quoten"],
)

api_router.include_router(
    wallet.router,
    prefix="/wallet",
    tags=["Finanzen & Transaktionen"],
)

api_router.include_router(
    users.router,
    prefix="/user",
    tags=["Benutzerverwaltung"],
)

# Leonhard: markets endpoints
api_router.include_router(
    markets.router,
    prefix="/markets",
    tags=["Wetten & Quoten"],
)

# WebSocket endpoint for real-time updates (mounted under the API prefix)
api_router.include_router(websocket.router)