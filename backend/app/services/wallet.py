"""Simple, in-memory wallet service used as a placeholder implementation.

This file provides minimal async functions that match the signatures used
elsewhere in the project. It is intentionally lightweight so it can be
replaced easily with a DB-backed implementation later.
"""
from typing import Dict

# very small in-memory store: user_id -> balance
_balances: Dict[int, float] = {}


async def get_user_balance(user_id: int) -> float:
    """Return the user's balance (defaulting to 1000.0 for new users)."""
    return _balances.get(user_id, 1000.0)


async def update_user_balance(user_id: int, amount: float) -> float:
    """Add `amount` to the user's balance and return the new balance.

    `amount` may be negative to subtract funds.
    """
    current = _balances.get(user_id, 1000.0)
    new = current + amount
    _balances[user_id] = new
    return new


async def claim_daily(user_id: int, bonus: float = 100.0) -> float:
    """Give a daily bonus. This placeholder always grants the bonus.

    Replace with rate-limiting or date checks in a real implementation.
    """
    return await update_user_balance(user_id, bonus)
