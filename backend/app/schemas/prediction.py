# Prediction ist ein Alias für Bet (ein platzierter Tipp auf einen Markt).
# Die Wette (Bet) ist das zentrale Objekt; dieser Alias bleibt für Kompatibilität.
from app.schemas.bet import Bet, BetCreate, BetRead

Prediction = Bet
PredictionCreate = BetCreate
PredictionRead = BetRead

__all__ = ["Prediction", "PredictionCreate", "PredictionRead"]