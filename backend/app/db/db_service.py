"""
Du kannst dir entweder sqlalchemy (ORM) anschauen, oder eif mit vanilla sql arbeiten,
aber das sind die benötigten funktionen (derweil):

# --- Märkte ---
async def get_market_by_id(db: Session, market_id: int):
    "Gibt ein Markt-Modell zurück."
    pass

async def get_all_active_markets(db: Session):
    "Gibt Liste von Märkten mit Status 'OPEN' zurück."
    pass

async def create_market(db: Session, market_data: MarketCreate):
    "Erstellt DB-Eintrag für neuen Markt."
    pass

async def update_market_status(db: Session, market_id: int, new_status: str):
    "Setzt Status auf CLOSED oder RESOLVED."
    pass

# --- User & Wallet ---
async def get_user_balance(db: Session, user_id: int):
    "Gibt aktuellen Kontostand zurück."
    pass

async def update_user_balance(db: Session, user_id: int, amount: float):
    "Addiert/Subtrahiert Coins vom User-Konto."
    pass

# --- Wetten ---
async def get_bets_for_market(db: Session, market_id: int):
    "Gibt alle Wetten eines Marktes zurück (für Artorius)."
    pass

async def create_bet(db: Session, user_id: int, market_id: int, amount: float, choice: bool):
    "Speichert eine neue Wette ab."
    pass
"""