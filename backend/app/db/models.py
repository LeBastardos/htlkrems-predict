"""
SQLModel-Definitionen für die Datenbank-Tabellen.
Die Market-Tabelle wird durch market.py mit SQLModel+table=True definiert.
"""

from app.schemas.market import Market

__all__ = ["Market"]
