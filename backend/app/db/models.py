"""
Sammelpunkt für alle SQLModel-Tabellenmodelle.
Importiere hier, damit SQLModel.metadata.create_all() alle Tabellen kennt.
"""

from app.schemas.market import Market, OddsHistory
from app.schemas.user import User
from app.schemas.wallet import Transaction
from app.schemas.bet import Bet

__all__ = ["Market", "OddsHistory", "User", "Transaction", "Bet"]
