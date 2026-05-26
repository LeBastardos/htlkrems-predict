"""
SQLModel-Definitionen für die Datenbank-Tabellen.
Importiere die Tabellenmodelle hier, damit andere Module sie zentral nutzen können.
"""

from app.schemas.market import Market
from app.schemas.user import User
from app.schemas.wallet import Wallet, Transaction

__all__ = ["Market", "User", "Wallet", "Transaction"]
