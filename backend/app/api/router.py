from fastapi import APIRouter

from app.api.endpoints import wette, wallet, user

api_router = APIRouter()

api_router.include_router(
    wette.router,
    prefix="/wette",
    tags=["Wetten & Quoten"],
)

api_router.include_router(
    wallet.router,
    prefix="/wallet",
    tags=["Finanzen & Transaktionen"],
)

api_router.include_router(
    user.router,
    prefix="/user",
    tags=["Benutzerverwaltung"],
)   