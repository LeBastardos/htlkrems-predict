"""Service layer for market-related operations.

The functions are intentionally lightweight placeholders for now, but their
names and signatures are aligned with the FastAPI endpoints.
"""

from datetime import datetime

from app.schemas.market import Market, MarketCreate, MarketResolve


async def get_all_active_markets():
    """Return all markets that are currently open."""
    return []


async def create_new_market(market_data: MarketCreate):
    """Create a new market and return the serialized result."""
    return Market(
        title=market_data.title,
        description=market_data.description,
        end_date=market_data.end_date,
        initial_odds_yes=market_data.initial_odds_yes,
        initial_odds_no=market_data.initial_odds_no,
        id=1,
        status="OPEN",
        current_pool=0.0,
        odds_yes=market_data.initial_odds_yes,
        odds_no=market_data.initial_odds_no,
        created_at=datetime.now(),
    )


async def get_odds_history(market_id: int):
    """Return the historical odds for a market."""
    return {"market_id": market_id, "history": []}


async def process_market_payout(market_id: int, resolve_data: MarketResolve):
    """Resolve a market and calculate payouts."""
    return {"message": "Payout logic not implemented yet", "market_id": market_id, "outcome": resolve_data.outcome}


async def delete_market_entry(market_id: int, reason: str):
    """Delete a market if it is still eligible for deletion."""
    return {"status": "success", "market_id": market_id, "reason": reason}


# Backward-compatible aliases for endpoint naming.
get_active_markets = get_all_active_markets
create_market = create_new_market
get_market_history = get_odds_history
resolve_market = process_market_payout
delete_market = delete_market_entry