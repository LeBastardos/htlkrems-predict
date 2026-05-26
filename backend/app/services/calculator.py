"""
Quoten-Berechnung und Auszahlungslogik für das parimutuelle Wettsystem.

Grundprinzip (Parimutuel):
  - yes_pool  = Summe aller Einsätze auf "Ja"
  - no_pool   = Summe aller Einsätze auf "Nein"
  - total     = yes_pool + no_pool

Implizite Wahrscheinlichkeiten:
  - odds_yes  = yes_pool / total  (0..1, Wahrscheinlichkeit)
  - odds_no   = no_pool  / total  (0..1, Wahrscheinlichkeit)

Gewinn-Multiplikator für einen Gewinner-Einsatz:
  multiplier  = total / winning_pool
  payout      = multiplier * bet_amount

Mindest-Pool damit Odds nicht bei 0 landen: EPSILON-Technik.
"""

from __future__ import annotations

EPSILON = 1.0  # Virtueller Mindest-Pool pro Seite (verhindert Division durch 0)


def recalculate_odds(yes_pool: float, no_pool: float) -> tuple[float, float]:
    """
    Berechnet die aktuellen Quoten als implizite Wahrscheinlichkeiten.
    Gibt (odds_yes, odds_no) zurück, Werte liegen zwischen 0 und 1.
    """
    y = yes_pool + EPSILON
    n = no_pool + EPSILON
    total = y + n
    return round(y / total, 4), round(n / total, 4)


def calculate_payout(bet_amount: float, bet_choice: bool, yes_pool: float, no_pool: float) -> float:
    """
    Berechnet den Auszahlungsbetrag für eine einzelne Wette nach Auflösung.

    bet_choice: True = auf "Ja" gesetzt
    Gibt den Auszahlungsbetrag zurück (0 wenn verloren).
    """
    total = yes_pool + no_pool
    winning_pool = yes_pool if bet_choice else no_pool
    if winning_pool <= 0:
        return 0.0
    multiplier = total / winning_pool
    return round(bet_amount * multiplier, 2)


def estimate_payout_multiplier(bet_choice: bool, yes_pool: float, no_pool: float, new_amount: float) -> float:
    """
    Schätzt den Gewinn-Multiplikator für einen neuen Einsatz NACH dem Platzieren.
    Nützlich für das Frontend ("Möglicher Gewinn: X").
    """
    if bet_choice:
        new_yes = yes_pool + new_amount
        new_no = no_pool
    else:
        new_yes = yes_pool
        new_no = no_pool + new_amount

    total = new_yes + new_no
    winning_pool = new_yes if bet_choice else new_no
    if winning_pool <= 0:
        return 1.0
    return round(total / winning_pool, 4)