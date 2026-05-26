from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from app.schemas.market import MarketCreate, MarketRead, MarketDelete, MarketResolve, MarketHistory
import app.services.market_service as market_service
from app.core.auth import get_current_user
from app.db.models import User

router = APIRouter()

@router.get("/active", response_model=List[MarketRead])
async def get_active_markets():
    """
    GET /markets/active
    Gibt eine Liste aller aktiven Märkte zurück.
    """
    return await market_service.get_active_markets()

@router.post("/admin/create", response_model=MarketRead, status_code=status.HTTP_201_CREATED)
async def create_market(market_in: MarketCreate, current_user: User = Depends(get_current_user)):
    """
    POST /admin/create
    Erstellt einen neuen Markt mit den angegebenen Daten.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")
    return await market_service.create_market(market_in)

@router.get("/{market_id}/history", response_model=MarketHistory)
async def get_market_history(market_id: int):
    """
    GET /markets/{market_id}/history
    Gibt die Historie eines bestimmten Markts zurück.
    """
    return await market_service.get_market_history(market_id)

@router.post("/admin/resolve", response_model=dict)
async def resolve_market(market_id: int, resolution: MarketResolve, current_user: User = Depends(get_current_user)):
    """
    POST /admin/resolve
    Löst einen Markt auf und gibt das Ergebnis zurück.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")
    return await market_service.resolve_market(market_id, resolution)

@router.delete("/admin/markets/{market_id}")
async def delete_market(market_id: int, delete_info: MarketDelete, current_user: User = Depends(get_current_user)):
    """
    DELETE /admin/markets/{market_id}
    Löscht einen Markt mit Angabe eines Grundes.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")
    await market_service.delete_market(market_id, delete_info.reason)
    return {"message": f"Markt {market_id} wurde gelöscht."}