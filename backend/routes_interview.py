from fastapi import APIRouter, HTTPException, Depends

from config import logger
from models import FeedbackRequest, FeedbackReport, PLAN_LIMITS
from deps import try_get_user, get_current_user
from feedback import generate_and_save_feedback
from routes_user import get_or_create_subscription

api_router_interview = APIRouter(prefix="/api/interview")


@api_router_interview.get("/plan-config")
async def get_plan_config(current_user=Depends(get_current_user)):
    sub = get_or_create_subscription(current_user.id)
    plan = sub.get("plan", "free")
    plan_config = PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])
    return {
        "plan": plan,
        "maxDurationMinutes": plan_config["max_duration_minutes"],
        "interviewsRemaining": max(0, plan_config["interviews_allowed"] - sub.get("interviews_used", 0)),
    }


@api_router_interview.post("/validate-setup")
async def validate_interview_setup(req: FeedbackRequest, current_user=Depends(get_current_user)):
    sub = get_or_create_subscription(current_user.id)
    plan = sub.get("plan", "free")
    plan_config = PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])
    max_duration = plan_config["max_duration_minutes"]

    if req.durationMinutes > max_duration:
        raise HTTPException(
            status_code=400,
            detail=f"Your {plan} plan supports a maximum of {max_duration} minutes per interview.",
        )

    used = sub.get("interviews_used", 0)
    allowed = sub.get("interviews_allowed", 0)
    if used >= allowed:
        raise HTTPException(
            status_code=403,
            detail=f"You have used all {allowed} interviews on your {plan} plan. Upgrade to continue.",
        )

    return {"status": "ok", "maxDurationMinutes": max_duration}


@api_router_interview.post("/feedback", response_model=FeedbackReport)
async def generate_feedback(req: FeedbackRequest, current_user=Depends(try_get_user)):
    if not req.transcript:
        raise HTTPException(status_code=400, detail="Transcript is empty.")
    authenticated = current_user is not None
    logger.info(f"Feedback request received. Authenticated: {authenticated}, User: {getattr(current_user, 'id', None)}, Transcript turns: {len(req.transcript)}")
    return await generate_and_save_feedback(req, current_user)
