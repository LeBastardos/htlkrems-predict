# backend/app/services/market_service.py
from app.schemas.market import MarketCreate, MarketResolve
from datetime import datetime
import app.db.db_service as db_service

# Diese Funktionen füllt Artorius

async def get_all_active_markets():
    """Hol hier die Märkte von Robin."""
    # Vorläufiger Dummy für Jakob (Frontend)
    return []

async def create_new_market(market_data: MarketCreate):
    """Speichere den neuen Markt in der DB."""
    # Hier wird später das DB-Modell erstellt
    return {**market_data.dict(), "id": 1, "status": "OPEN", "current_pool": 0, "odds_yes": 0.5, "odds_no": 0.5, "created_at": datetime.now()}

async def get_odds_history(market_id: int):
    """Ziehe die historischen Quoten aus der History-Tabelle."""
    return {"market_id": market_id, "history": []}

async def process_market_payout(market_id: int, resolve_data: MarketResolve):
    """Hier kommt deine Kern-Logik aus AP 4 rein (Gewinnerpool / Gesamtpool)."""
    # 1. Gewinner ermitteln
    # 2. Payouts berechnen
    # 3. Wallet-Updates triggern
    return {"message": "Payout logic not implemented yet"}

async def delete_market_entry(market_id: int, reason: str):
    """Lösche den Markt nur, wenn noch keine Wetten existieren."""
    return {"status": "success", "reason": reason}