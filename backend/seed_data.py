"""Small helper to seed the local database with test data.

Run from the project root (after dependencies are installed and DB is reachable):

    python -m backend.seed_data

It will create an `admin` user, a regular user, wallets and one sample market.
"""
from datetime import datetime, timedelta

from sqlmodel import Session

from app.db.session import engine
from app.db.models import User, Market, Wallet


def seed() -> None:
    with Session(engine) as session:
        # create admin user
        admin = User(username="admin", email="admin@example.com", name="Admin User", role="admin")
        session.add(admin)
        session.commit()
        session.refresh(admin)

        # wallet for admin
        w = Wallet(user_id=admin.id, balance=10000.0)
        session.add(w)

        # sample regular user
        user = User(username="leo", email="leo@example.com", name="Leo Tester", role="user")
        session.add(user)
        session.commit()
        session.refresh(user)

        session.add(Wallet(user_id=user.id, balance=1000.0))

        # sample market
        m = Market(
            title="Will project be finished this week?",
            description="A quick sample market",
            end_date=datetime.utcnow() + timedelta(days=7),
            initial_odds_yes=0.5,
            initial_odds_no=0.5,
            status="OPEN",
            current_pool=0.0,
            odds_yes=0.5,
            odds_no=0.5,
            created_at=datetime.utcnow(),
        )
        session.add(m)
        session.commit()
        print("Seeding complete. Admin id:", admin.id)


if __name__ == "__main__":
    seed()
