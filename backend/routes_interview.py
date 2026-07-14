from fastapi import APIRouter, HTTPException, Depends

from models import FeedbackRequest, FeedbackReport
from deps import try_get_user
from feedback import generate_and_save_feedback

api_router_interview = APIRouter(prefix="/api/interview")


@api_router_interview.post("/feedback", response_model=FeedbackReport)
async def generate_feedback(req: FeedbackRequest, current_user=Depends(try_get_user)):
    if not req.transcript:
        raise HTTPException(status_code=400, detail="Transcript is empty.")
    return await generate_and_save_feedback(req, current_user)
