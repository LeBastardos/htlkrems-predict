from __future__ import annotations

from typing import Tuple
from sqlmodel import Session, select
from fastapi import HTTPException, status

from app.db.session import engine
from app.schemas.bet import Bet, BetCreate, BetRead
from app.schemas.market import Market
import app.services.wallet as wallet_service


async def place_bet(bet_in: BetCreate) -> BetRead:
    with Session(engine) as session:
        market = session.get(Market, bet_in.market_id)
        if market is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Market not found")
        if market.status != "OPEN":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Market is not open for betting")

        # check balance
        bal = await wallet_service.get_user_balance(bet_in.user_id)
        if bal < bet_in.amount:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient balance")

        # deduct amount
        await wallet_service.update_user_balance(bet_in.user_id, -bet_in.amount, reason=f"bet:{bet_in.market_id}")

        # create bet record
        db_bet = Bet(user_id=bet_in.user_id, market_id=bet_in.market_id, amount=bet_in.amount, choice=bet_in.choice)
        session.add(db_bet)

        # update market pool
        market.current_pool = float(market.current_pool or 0) + float(bet_in.amount)

        # recompute odds based on all bets
        bets = session.exec(select(Bet).where(Bet.market_id == market.id)).all()
        sum_yes = sum(b.amount for b in bets if b.choice)
        sum_no = sum(b.amount for b in bets if not b.choice)
        total = sum_yes + sum_no
        if total > 0:
            market.odds_yes = float(sum_yes) / float(total)
            market.odds_no = float(sum_no) / float(total)

        session.add(market)
        session.commit()
        session.refresh(db_bet)

        return BetRead.model_validate(db_bet, from_attributes=True)


async def get_bets_for_market(market_id: int):
    with Session(engine) as session:
        stmt = select(Bet).where(Bet.market_id == market_id)
        return session.exec(stmt).all()
