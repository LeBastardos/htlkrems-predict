"""
Quoten-Berechnung und Auszahlungs-Logik (parimutuel system).

Odds werden als implizite Wahrscheinlichkeiten berechnet:
  odds_yes = pool_yes / (pool_yes + pool_no)

Ein Wert von 0.5 bedeutet 50/50; nahe 1.0 bedeutet fast alle Coins auf "Ja".
"""

from __future__ import annotations

_MIN_ODDS = 0.01   # prevents 0 or 1


def recalculate_odds(pool_yes: float, pool_no: float) -> tuple[float, float]:
    """
    Berechnet die impliziten Wahrscheinlichkeiten aus den Pools.
    Gibt (odds_yes, odds_no) zurück, beide zwischen 0.01 und 0.99.
    """
    total = pool_yes + pool_no
    if total <= 0:
        return 0.5, 0.5

    raw_yes = pool_yes / total
    raw_no = pool_no / total

    # clamp to avoid 0 or 1
    odds_yes = max(_MIN_ODDS, min(1 - _MIN_ODDS, round(raw_yes, 4)))
    odds_no = max(_MIN_ODDS, min(1 - _MIN_ODDS, round(raw_no, 4)))

    return odds_yes, odds_no


def calculate_potential_payout(
    bet_amount: float,
    pool_yes: float,
    pool_no: float,
    choice: bool,
) -> float:
    """
    Schätzt die erwartete Auszahlung für eine Wette (vor Platzierung).
    Formel: (bet_amount / (winning_pool + bet_amount)) * total_pool_after
    """
    total_pool = pool_yes + pool_no + bet_amount
    if choice:
        new_winning_pool = pool_yes + bet_amount
    else:
        new_winning_pool = pool_no + bet_amount

    if new_winning_pool <= 0:
        return 0.0

    return round((bet_amount / new_winning_pool) * total_pool, 4)


def calculate_final_payout(
    bet_amount: float,
    winning_pool: float,
    total_pool: float,
) -> float:
    """
    Berechnet die finale Auszahlung nach Auflösung.
    Formel: (bet_amount / winning_pool) * total_pool
    """
    if winning_pool <= 0:
        return 0.0
    return round((bet_amount / winning_pool) * total_pool, 4)