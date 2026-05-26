"""Small helper to seed the local database with test data.

Run from the project root (after dependencies are installed and DB is reachable):

    python -m backend.seed_data

It will create an `admin` user, a regular user, wallets and one sample market.
"""
from datetime import datetime, timedelta

from sqlmodel import Session

from app.db.session import engine
from app.db.models import User, Market, Wallet, Bet


def seed() -> None:
    with Session(engine) as session:
        # create admin user
        admin = User(username="admin", email="admin@example.com", name="Admin User", role="admin")
        admin_lyvon = User(
            username="lyvon",
            email="l.yvon@htlkrems.at",
            name="L. Yvon",
            role="admin",
        )

        # sample regular user
        user = User(username="leo", email="leo@example.com", name="Leo Tester", role="user")

        session.add_all([admin, admin_lyvon, user])
        session.commit()
        session.refresh(admin)
        session.refresh(admin_lyvon)
        session.refresh(user)

        # wallets
        admin_wallet = Wallet(user_id=admin.id, balance=10000.0)
        admin_lyvon_wallet = Wallet(user_id=admin_lyvon.id, balance=12000.0)
        user_wallet = Wallet(user_id=user.id, balance=2000.0)
        session.add_all([admin_wallet, admin_lyvon_wallet, user_wallet])

        # sample markets
        market_primary = Market(
            title="Will the project be finished this week?",
            description="Track whether the current sprint goals are delivered on time.",
            end_date=datetime.utcnow() + timedelta(days=7),
            initial_odds_yes=0.55,
            initial_odds_no=0.45,
            status="OPEN",
            current_pool=0.0,
            odds_yes=0.55,
            odds_no=0.45,
            created_at=datetime.utcnow(),
        )
        market_secondary = Market(
            title="Will the class trip happen in June?",
            description="Predict if the planned class trip stays on schedule.",
            end_date=datetime.utcnow() + timedelta(days=14),
            initial_odds_yes=0.6,
            initial_odds_no=0.4,
            status="OPEN",
            current_pool=0.0,
            odds_yes=0.6,
            odds_no=0.4,
            created_at=datetime.utcnow(),
        )
        session.add_all([market_primary, market_secondary])
        session.commit()
        session.refresh(market_primary)
        session.refresh(market_secondary)

        wallet_map = {
            admin.id: admin_wallet,
            admin_lyvon.id: admin_lyvon_wallet,
            user.id: user_wallet,
        }
        market_totals = {
            market_primary.id: {"yes": 0.0, "no": 0.0},
            market_secondary.id: {"yes": 0.0, "no": 0.0},
        }

        def record_bet(bet_user: User, market: Market, amount: float, choice: bool) -> None:
            session.add(Bet(user_id=bet_user.id, market_id=market.id, amount=amount, choice=choice))
            market.current_pool = float(market.current_pool or 0) + float(amount)
            totals = market_totals[market.id]
            totals["yes" if choice else "no"] += float(amount)
            wallet_map[bet_user.id].balance -= float(amount)

        record_bet(admin, market_primary, 300.0, True)
        record_bet(user, market_primary, 200.0, False)
        record_bet(admin_lyvon, market_primary, 500.0, True)
        record_bet(user, market_secondary, 150.0, True)
        record_bet(admin, market_secondary, 250.0, False)

        for market in (market_primary, market_secondary):
            totals = market_totals[market.id]
            total = totals["yes"] + totals["no"]
            if total:
                market.odds_yes = totals["yes"] / total
                market.odds_no = totals["no"] / total
            session.add(market)

        session.commit()
        print("Seeding complete. Admin id:", admin.id, "Admin (lyvon) id:", admin_lyvon.id)


if __name__ == "__main__":
    seed()
