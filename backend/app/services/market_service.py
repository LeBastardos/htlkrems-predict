from __future__ import annotations

from datetime import datetime
from typing import List

from sqlmodel import Session, select
from sqlalchemy import delete, text

from app.db.session import engine
from app.schemas.market import Market, MarketCreate, MarketHistory, MarketHistoryPoint
from app.schemas.bet import Bet
import app.services.wallet as wallet_service
import app.services.notification_service as notification_service
from app.api.websocket import notify_market_update
import app.services.cleanup_service as cleanup_service


async def get_active_markets() -> List[Market]:
    with Session(engine) as session:
        stmt = select(Market).where(Market.status == "OPEN")
        results = session.exec(stmt).all()
        return results


async def create_market(market_data: MarketCreate) -> Market:
    with Session(engine) as session:
        m = Market(
            title=market_data.title,
            description=market_data.description,
            end_date=market_data.end_date,
            initial_odds_yes=market_data.initial_odds_yes,
            initial_odds_no=market_data.initial_odds_no,
            status="OPEN",
            current_pool=0.0,
            odds_yes=market_data.initial_odds_yes,
            odds_no=market_data.initial_odds_no,
            created_at=datetime.utcnow(),
        )
        session.add(m)
        session.commit()
        session.refresh(m)
        return m


async def get_market(market_id: int) -> Market:
    with Session(engine) as session:
        market = session.get(Market, market_id)
        if market is None:
            raise ValueError("Market not found")
        return market


async def get_market_history(market_id: int) -> MarketHistory:
    with Session(engine) as session:
        m = session.get(Market, market_id)
        if not m:
            return MarketHistory(market_id=market_id, history=[])

        # Build history points from bets (ordered by creation time).
        stmt = select(Bet).where(Bet.market_id == market_id).order_by(Bet.created_at)
        bets = session.exec(stmt).all()

        history: list[MarketHistoryPoint] = []

        # initial odds from market definition (fallback to stored odds)
        init_yes = getattr(m, "initial_odds_yes", None)
        init_no = getattr(m, "initial_odds_no", None)
        if init_yes is None:
            init_yes = float(m.odds_yes or 0)
        if init_no is None:
            init_no = float(m.odds_no or 0)

        created_ts = getattr(m, "created_at", None) or datetime.utcnow()
        history.append(MarketHistoryPoint(timestamp=created_ts, odds_yes=float(init_yes), odds_no=float(init_no)))

        sum_yes = 0.0
        sum_no = 0.0

        for b in bets:
            if getattr(b, "choice", False):
                sum_yes += float(getattr(b, "amount", 0) or 0)
            else:
                sum_no += float(getattr(b, "amount", 0) or 0)

            total = sum_yes + sum_no
            if total > 0:
                yes = float(sum_yes) / float(total)
                no = float(sum_no) / float(total)
            else:
                yes = history[-1].odds_yes
                no = history[-1].odds_no

            history.append(MarketHistoryPoint(timestamp=getattr(b, "created_at", datetime.utcnow()), odds_yes=yes, odds_no=no))

        # final point: current stored odds (or last computed)
        try:
            curr_yes = float(m.odds_yes or (history[-1].odds_yes if history else 0))
            curr_no = float(m.odds_no or (history[-1].odds_no if history else 0))
            history.append(MarketHistoryPoint(timestamp=datetime.utcnow(), odds_yes=curr_yes, odds_no=curr_no))
        except Exception:
            pass

        return MarketHistory(market_id=market_id, history=history)


async def resolve_market(market_id: int, resolution) -> dict:
    outcome = getattr(resolution, "outcome", None)
    with Session(engine) as session:
        m = session.get(Market, market_id)
        if not m:
            return {"error": "market not found"}

        # collect bets
        stmt = select(Bet).where(Bet.market_id == market_id).order_by(Bet.created_at)
        bets = session.exec(stmt).all()

        # compute pools
        sum_yes = sum(float(b.amount or 0) for b in bets if b.choice)
        sum_no = sum(float(b.amount or 0) for b in bets if not b.choice)

        # mark market resolved
        m.status = "RESOLVED"
        m.current_pool = 0.0
        session.add(m)

        # payout winners: winners get back their stake plus proportional share of losers
        if outcome is True:
            winners = [b for b in bets if b.choice]
            winners_total = sum_yes
            losers_total = sum_no
        else:
            winners = [b for b in bets if not b.choice]
            winners_total = sum_no
            losers_total = sum_yes

        # protect division by zero
        for b in bets:
            try:
                if b in winners and winners_total > 0:
                    payout = float(b.amount) + (float(b.amount) / float(winners_total)) * float(losers_total)
                    # credit payout to user
                    await wallet_service.update_user_balance(b.user_id, payout, reason=f"payout:market:{market_id}")
                    b.status = "won"
                    # create notification for winner
                    await notification_service.create_notification(b.user_id, f"Your bet on '{m.title}' won. Payout: {payout:.2f} coins.", link=f"/market.html?id={market_id}")
                else:
                    b.status = "lost"
                    # create notification for loser
                    await notification_service.create_notification(b.user_id, f"Your bet on '{m.title}' lost.", link=f"/market.html?id={market_id}")
                session.add(b)
            except Exception:
                # best-effort: continue with other bets
                session.add(b)

        session.commit()

        # After payouts and marking bets, remove bets for this market from the database
        try:
            # delete bets for this market
            session.exec(delete(Bet).where(Bet.market_id == market_id))
            session.commit()

            # if no bets remain in the table, reset AUTO_INCREMENT (MySQL)
            remaining = session.exec(select(Bet).limit(1)).first()
            if not remaining:
                try:
                    session.exec(text("ALTER TABLE bets AUTO_INCREMENT = 1"))
                    session.commit()
                except Exception:
                    # ignore if DB doesn't support this or fails
                    pass
        except Exception:
            # best-effort: do not fail resolution on cleanup errors
            try:
                session.rollback()
            except Exception:
                pass

        # schedule deletion of market after 24 hours (best-effort)
        try:
            await cleanup_service.schedule_delete(market_id, delay_hours=24)
        except Exception:
            pass

    # broadcast resolved event
    try:
        await notify_market_update(market_id, {"resolved": True, "outcome": bool(outcome)})
    except Exception:
        pass

    return {"market_id": market_id, "status": "resolved", "outcome": outcome}


async def delete_market(market_id: int, reason: str) -> None:
    with Session(engine) as session:
        m = session.get(Market, market_id)
        if m:
            session.delete(m)
            session.commit()