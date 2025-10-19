from datetime import date as dt_date
from fastapi import FastAPI, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import select
from .db import get_db
from .models import User, BodyMetric, Goal, PlanVersion
from .planner import calc_targets, week_monday, build_weekly_workouts

app = FastAPI(title="Fit Agent API")

@app.get("/health")
def health():
    return { "ok": True }

# ---------- DTOs ----------
class MetricIn(BaseModel):
    email: str
    weight_lb: float = Field(gt=0)
    bodyfat_pct: float | None = Field(default=None, ge=0, le=100)
    date: dt_date | None = None
    notes: str | None = None

class GoalIn(BaseModel):
    email: str
    target_weight_lb: float = Field(gt=0)
    weekly_loss_pct: float = Field(ge=0.5, le=2.0)  # safe band
    activity_level: str = Field(default="moderate")

# ---------- Helpers ----------
def get_or_create_user(db: Session, email: str) -> User:
    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if not user:
        user = User(email=email, display_name=email.split("@")[0].title())
        db.add(user)
        db.flush()
    return user

@app.get("/metrics/latest")
def latest_metric(email: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email).one_or_none()
    if not user:
        return { "error": "User not found" }

    latest_metric = (
        db.query(BodyMetric)
        .filter(BodyMetric.user_id == user.id)
        .order_by(BodyMetric.date.desc(), BodyMetric.id.desc())
        .first()
    )

    if not latest_metric:
        return { "error": "No metrics found for user" }

    return {"user": user.display_name, "latest_metric": None if not latest_metric else {
        "date": str(latest_metric.date), "weight_lb": latest_metric.weight_lb, "bodyfat_pct": latest_metric.bodyfat_pct, "notes": latest_metric.notes
    }}

@app.post("/metrics/log")
def log_metric(payload: MetricIn, db: Session = Depends(get_db)):
    user = get_or_create_user(db, payload.email)
    m = BodyMetric(
        user_id=user.id,
        date=payload.date or dt_date.today(),  # <-- map to 'date'
        weight_lb=payload.weight_lb,
        bodyfat_pct=payload.bodyfat_pct,
        notes=payload.notes,
    )
    db.add(m)
    db.commit()
    return {"ok": True, "metric_id": m.id}


@app.post("/goals/set")
def set_goal(g: GoalIn, db: Session = Depends(get_db)):
    user = get_or_create_user(db, g.email)

    goal = db.execute(select(Goal).where(Goal.user_id == user.id)).scalar_one_or_none()
    if not goal:
        goal = Goal(
            user_id=user.id,
            target_weight_lb=g.target_weight_lb,
            weekly_loss_pct=g.weekly_loss_pct,
            activity_level=g.activity_level,
        )
        db.add(goal)
    else:
        goal.target_weight_lb = g.target_weight_lb
        goal.weekly_loss_pct = g.weekly_loss_pct
        goal.activity_level = g.activity_level

    db.commit()
    db.refresh(goal)
    return {"ok": True, "goal": {
        "user_id": goal.user_id,
        "target_weight_lb": goal.target_weight_lb,
        "weekly_loss_pct": goal.weekly_loss_pct,
        "activity_level": goal.activity_level,
    }}

@app.get("/plan/weekly")
def get_weekly_plan(email: str, start: dt_date | None = None, db: Session = Depends(get_db)):
    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if not user:
        return {"error": "user not found"}

    # current weight = latest metric
    latest = db.execute(
        select(BodyMetric).where(BodyMetric.user_id == user.id).order_by(BodyMetric.date.desc(), BodyMetric.id.desc())
    ).scalars().first()
    if not latest:
        return {"error": "no metrics logged"}

    goal = db.execute(select(Goal).where(Goal.user_id == user.id)).scalar_one_or_none()
    weekly_loss_pct = goal.weekly_loss_pct if goal else 1.0
    activity_level = goal.activity_level if goal else "moderate"

    cals, protein = calc_targets(latest.weight_lb, weekly_loss_pct, activity_level)
    week0 = week_monday(start or dt_date.today())
    workouts = build_weekly_workouts()

    # Upsert a PlanVersion for this week (new version each call for now)
    plan = PlanVersion(
        user_id=user.id,
        week_start=week0,
        calories_per_day=cals,
        protein_g_per_day=protein,
        plan_json={"workouts": workouts, "notes": "Rule-based v1"},
    )
    db.add(plan)
    db.commit()

    return {
        "user": user.display_name,
        "week_start": str(week0),
        "targets": {"calories": cals, "protein_g": protein},
        "workouts": workouts,
        "plan_version_id": plan.id,
    }