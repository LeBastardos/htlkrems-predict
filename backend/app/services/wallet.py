from __future__ import annotations

from typing import List
from datetime import datetime

from sqlmodel import Session, select

from app.db.session import engine
from app.schemas.wallet import Wallet, Transaction, TransactionRead
from fastapi import HTTPException, status


INITIAL_BALANCE = 1000.0


async def get_user_balance(user_id: int) -> float:
  with Session(engine) as session:
    wallet = session.get(Wallet, user_id)
    if wallet is None:
      wallet = Wallet(user_id=user_id, balance=INITIAL_BALANCE)
      session.add(wallet)
      session.commit()
      session.refresh(wallet)
    return wallet.balance


async def update_user_balance(user_id: int, amount: float, reason: str | None = None) -> float:
  with Session(engine) as session:
    wallet = session.get(Wallet, user_id)
    if wallet is None:
      wallet = Wallet(user_id=user_id, balance=INITIAL_BALANCE)
      session.add(wallet)

    wallet.balance = float(wallet.balance or 0) + float(amount)

    tx = Transaction(user_id=user_id, amount=amount, type=("credit" if amount >= 0 else "debit"), reason=reason, timestamp=datetime.utcnow())
    session.add(tx)
    session.add(wallet)
    session.commit()
    session.refresh(wallet)
    return wallet.balance


async def claim_daily(user_id: int) -> float:
  # simple daily claim implementation (no cooldown tracking)
  DAILY_AMOUNT = 100.0
  return await update_user_balance(user_id, DAILY_AMOUNT, reason="daily_claim")


async def get_user_history(user_id: int) -> List[TransactionRead]:
  with Session(engine) as session:
    statement = select(Transaction).where(Transaction.user_id == user_id).order_by(Transaction.timestamp.desc())
    results = session.exec(statement).all()
    return [TransactionRead.model_validate(r, from_attributes=True) for r in results]

