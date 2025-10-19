from __future__ import annotations
from datetime import date, timedelta
from math import ceil

def calc_targets(current_weight_lbs: float, weekly_loss_pct: float, activity_level: str = "moderate") -> tuple[int, int]:
    # maintenance multipliers (rough heuristic)
    mult = {
        "sedentary": 12.0,
        "light": 13.0,
        "moderate": 14.0,
        "high": 15.0
    }.get(activity_level, 14.0)
    maintenance = current_weight_lbs * mult

    #target deficit from %bw per week (1% = ~500 kcal/day per 50lbs; use 0.01 * weight * 31 as approx day)
    daily_deficit = (weekly_loss_pct / 100.0) * current_weight_lbs * 31.0
    calories = max(1200, int(maintenance - daily_deficit))
    
    # protein: 0.8–1.0 g/lb is common; start at 0.9
    protein = max(100, int(current_weight_lbs * 0.9))
    return calories, protein

def week_monday(d: date) -> date:
    """Given a date, return the Monday of that week."""
    return d - timedelta(days=d.weekday())

def build_weekly_workouts(equipment: list[str] | None = None) -> list[dict]:
    # Minimal 6-session template (4 strength + 2 cardio). Adjust easily later.
    return [
        {"day": "Mon", "type": "strength_upper", "exercises": ["Bench (barbell)", "Row (dumbbell)", "Shoulder press", "Lat pulldown", "Triceps"], "notes": "RPE 6-7"},
        {"day": "Tue", "type": "cardio", "exercises": ["Peloton 30–45 min (Z2)"], "notes": "Keep easy pace"},
        {"day": "Wed", "type": "strength_lower", "exercises": ["Back squat", "RDL", "Lunge", "Calf raise", "Core"], "notes": "RPE 6-7"},
        {"day": "Thu", "type": "active_recovery", "exercises": ["Walk 30–45 min"], "notes": "Optional mobility"},
        {"day": "Fri", "type": "strength_full", "exercises": ["Deadlift (light)", "Incline DB press", "Cable row", "Leg press/DB goblet", "Core"], "notes": "RPE ~6"},
        {"day": "Sat", "type": "cardio", "exercises": ["Peloton 45–60 min (Z2)"], "notes": "Longer easy ride"},
        # Sun off by default
    ]