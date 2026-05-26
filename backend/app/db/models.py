"""
SQLModel-Definitionen für die Datenbank-Tabellen.
Importiere die Tabellenmodelle hier, damit andere Module sie zentral nutzen können.
"""

from app.schemas.market import Market, OddsHistory
from app.schemas.user import User
from app.schemas.wallet import Transaction
from app.schemas.bet import Bet

__all__ = ["Market", "OddsHistory", "User", "Transaction", "Bet"]
