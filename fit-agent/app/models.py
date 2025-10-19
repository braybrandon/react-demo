from __future__ import annotations
from datetime import date, datetime
from sqlalchemy import (
    String, Integer, Float, Date, DateTime, JSON, func, ForeignKey
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .db import Base

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(120))
    metrics: Mapped[list["BodyMetric"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )

class BodyMetric(Base):
    __tablename__ = "body_metrics"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    date: Mapped[date] = mapped_column(Date, default=func.current_date())
    weight_lb: Mapped[float] = mapped_column(Float)
    bodyfat_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    user: Mapped["User"] = relationship(back_populates="metrics")

class Goal(Base):
    __tablename__ = "goals"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, unique=True
    )
    target_weight_lb: Mapped[float] = mapped_column(Float)
    weekly_loss_pct: Mapped[float] = mapped_column(Float, default=1.0)
    activity_level: Mapped[str] = mapped_column(String(20), default="moderate")
    updated_at: Mapped[datetime] = mapped_column(  # <-- datetime, not str
        DateTime(timezone=False), server_default=func.now(), onupdate=func.now()
    )
    user: Mapped["User"] = relationship(backref="goal", uselist=False)

class PlanVersion(Base):
    __tablename__ = "plan_versions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    week_start: Mapped[date] = mapped_column(Date)
    calories_per_day: Mapped[int] = mapped_column(Integer)
    protein_g_per_day: Mapped[int] = mapped_column(Integer)
    plan_json: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(  # <-- datetime, not str
        DateTime(timezone=False), server_default=func.now()
    )
    user: Mapped["User"] = relationship(backref="plans")
