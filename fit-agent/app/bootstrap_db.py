from sqlalchemy.orm import Session
from .db import Base, engine, SessionLocal
from .models import User, BodyMetric

def main():
    print("Creating tables (if not exist)...")
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        user = db.query(User).filter_by(email="you@example.com").one_or_none()
        if not user:
            user = User(
                email="you@example.com",
                display_name="Your Name"
            )
            db.add(user)
            db.flush()
            print(f"Created default user with email: {user.email}")

            # Add sample body metrics (today)
            metric = BodyMetric(user_id=user.id, weight_lb=274.0, bodyfat_pct=None, notes="Initial seed")
            db.add(metric)
            db.commit()
            print(f"Created sample body metric for user: {user.email}")

            # Read back latest metric
            latest_metric = (
                db.query(BodyMetric)
                .filter(BodyMetric.user_id == user.id)
                .order_by(BodyMetric.date.desc())
                .first()
            )

            print(f"Latest body metric for user {user.email}: {latest_metric}")

if __name__ == "__main__":
    main()
