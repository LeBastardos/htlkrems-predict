from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.core.auth import get_current_user
from app.db.models import User
from app.db.session import get_session
from app.schemas.market import MarketCreate, MarketHistory, MarketRead, MarketResolve
import app.services.market_service as market_service

router = APIRouter()


def _require_admin_or_trustee(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ("admin", "trustee"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur Admins und Trusted-User dürfen diese Aktion ausführen.",
        )
    return current_user


@router.get("/active", response_model=List[MarketRead])
def get_active_markets(db: Session = Depends(get_session)):
    """Liste aller offenen Märkte."""
    return market_service.get_active_markets(db)


@router.get("/{market_id}/history", response_model=MarketHistory)
def get_market_history(market_id: int, db: Session = Depends(get_session)):
    """Quoten-Verlauf eines Markts."""
    return market_service.get_market_history(db, market_id)


@router.post(
    "/admin/create",
    response_model=MarketRead,
    status_code=status.HTTP_201_CREATED,
)
def create_market(
    market_in: MarketCreate,
    db: Session = Depends(get_session),
    current_user: User = Depends(_require_admin_or_trustee),
):
    """Admin/Trustee: neuen Markt anlegen."""
    return market_service.create_market(db, market_in, created_by=current_user.id)


@router.post("/admin/resolve", response_model=dict)
def resolve_market(
    resolve_data: MarketResolve,
    db: Session = Depends(get_session),
    _: User = Depends(_require_admin_or_trustee),
):
    """Admin/Trustee: Markt auflösen und Auszahlungen berechnen."""
    try:
        return market_service.resolve_market(db, resolve_data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.delete("/admin/{market_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_market(
    market_id: int,
    reason: str,
    db: Session = Depends(get_session),
    _: User = Depends(_require_admin_or_trustee),
):
    """Admin/Trustee: Markt löschen (nur wenn noch keine Einsätze)."""
    market_service.delete_market(db, market_id, reason)