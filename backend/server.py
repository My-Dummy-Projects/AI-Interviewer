from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import logging
import re
from pathlib import Path
from pydantic import BaseModel
from typing import List, Literal, Optional
from openai import OpenAI
from supabase import create_client, Client as SupabaseClient
from datetime import datetime


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Supabase client (service role for admin operations)
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
supabase: Optional[SupabaseClient] = None
if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# OpenRouter (OpenAI-compatible)
OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY', '')
OPENROUTER_MODEL = os.environ.get('OPENROUTER_MODEL', 'openai/gpt-oss-20b:free')
VAPI_PUBLIC_KEY = os.environ.get('VAPI_PUBLIC_KEY', '')
VAPI_ASSISTANT_ID = os.environ.get('VAPI_ASSISTANT_ID', '')

app = FastAPI(title="AI Voice Mock Interview MVP")
api_router = APIRouter(prefix="/api")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)


# ---------- Models ----------
class TranscriptTurn(BaseModel):
    role: Literal["user", "assistant"]
    text: str
    timestamp: Optional[int] = None


class FeedbackRequest(BaseModel):
    jobRole: str
    experienceLevel: str
    durationMinutes: int
    transcript: List[TranscriptTurn]


class SkillScores(BaseModel):
    technical: int
    communication: int
    problemSolving: int
    confidence: int


class QuestionEvaluation(BaseModel):
    question: str
    answerSummary: str
    score: int
    feedback: str


class FeedbackReport(BaseModel):
    overallScore: int
    skills: SkillScores
    strengths: List[str]
    improvements: List[str]
    questionEvaluations: List[QuestionEvaluation]
    finalRecommendation: str
    learningSuggestions: List[str]
    summary: str


class ConfigResponse(BaseModel):
    vapiPublicKey: str
    vapiAssistantId: str
    ready: bool


# ---------- Auth Models ----------
class SignUpRequest(BaseModel):
    email: str
    password: str


class SignInRequest(BaseModel):
    email: str
    password: str


class ResetPasswordRequest(BaseModel):
    email: str


class AuthResponse(BaseModel):
    user: dict
    session: dict


class UserProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None


class UserProfileResponse(BaseModel):
    id: str
    email: str
    display_name: str
    avatar_url: str
    bio: str
    created_at: str
    updated_at: str


class InterviewSummary(BaseModel):
    id: str
    jobRole: str
    experienceLevel: str
    durationMinutes: int
    overallScore: int
    completedAt: str


class InterviewHistoryResponse(BaseModel):
    interviews: List[InterviewSummary]
    total: int


class DashboardStats(BaseModel):
    totalInterviews: int
    averageScore: float
    bestScore: int
    worstScore: int
    totalPracticeMinutes: int
    recentScores: List[int]
    scoreDistribution: dict
    skillAverages: dict


# ---------- Auth Helpers ----------
async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ")[1]
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase not configured")
    try:
        resp = supabase.auth.get_user(token)
        return resp.user
    except Exception as e:
        logger.warning(f"Auth check failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid or expired token")


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"message": "AI Voice Mock Interview API"}


@api_router.get("/config", response_model=ConfigResponse)
async def get_config():
    return ConfigResponse(
        vapiPublicKey=VAPI_PUBLIC_KEY,
        vapiAssistantId=VAPI_ASSISTANT_ID,
        ready=bool(VAPI_PUBLIC_KEY and VAPI_ASSISTANT_ID),
    )


# ---------- Auth Routes ----------
@api_router.post("/auth/signup", response_model=AuthResponse)
async def signup(req: SignUpRequest):
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase not configured")
    try:
        resp = supabase.auth.sign_up({"email": req.email, "password": req.password})
        return AuthResponse(
            user=resp.user.model_dump() if hasattr(resp.user, 'model_dump') else dict(resp.user),
            session=resp.session.model_dump() if hasattr(resp.session, 'model_dump') else dict(resp.session) if resp.session else {},
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@api_router.post("/auth/signin", response_model=AuthResponse)
async def signin(req: SignInRequest):
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase not configured")
    try:
        resp = supabase.auth.sign_in_with_password({"email": req.email, "password": req.password})
        return AuthResponse(
            user=resp.user.model_dump() if hasattr(resp.user, 'model_dump') else dict(resp.user),
            session=resp.session.model_dump() if hasattr(resp.session, 'model_dump') else dict(resp.session),
        )
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid email or password")


@api_router.post("/auth/signout")
async def signout(authorization: Optional[str] = Header(None)):
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase not configured")
    try:
        if authorization and authorization.startswith("Bearer "):
            token = authorization.split(" ")[1]
            user = supabase.auth.get_user(token)
            supabase.auth.admin.sign_out(user.user.id)
        return {"message": "Signed out successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@api_router.post("/auth/reset-password")
async def reset_password(req: ResetPasswordRequest):
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase not configured")
    try:
        supabase.auth.reset_password_email(req.email)
        return {"message": "Password reset email sent"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ---------- User Profile Routes ----------
@api_router.get("/user/profile", response_model=UserProfileResponse)
async def get_profile(current_user=Depends(get_current_user)):
    user_id = current_user.id
    collection = db["user_profiles"]
    profile = await collection.find_one({"user_id": user_id})
    if not profile:
        profile = {
            "user_id": user_id,
            "email": current_user.email,
            "display_name": current_user.email.split("@")[0],
            "avatar_url": "",
            "bio": "",
            "created_at": str(current_user.created_at or ""),
            "updated_at": str(current_user.created_at or ""),
        }
        await collection.insert_one(profile)
    return UserProfileResponse(
        id=str(profile["_id"]),
        email=profile.get("email", current_user.email),
        display_name=profile.get("display_name", current_user.email.split("@")[0]),
        avatar_url=profile.get("avatar_url", ""),
        bio=profile.get("bio", ""),
        created_at=str(profile.get("created_at", "")),
        updated_at=str(profile.get("updated_at", "")),
    )


@api_router.put("/user/profile", response_model=UserProfileResponse)
async def update_profile(req: UserProfileUpdate, current_user=Depends(get_current_user)):
    user_id = current_user.id
    collection = db["user_profiles"]
    update_data = {k: v for k, v in req.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    update_data["updated_at"] = str(datetime.utcnow())
    result = await collection.update_one(
        {"user_id": user_id},
        {"$set": update_data},
        upsert=True,
    )
    profile = await collection.find_one({"user_id": user_id})
    return UserProfileResponse(
        id=str(profile["_id"]),
        email=profile.get("email", current_user.email),
        display_name=profile.get("display_name", ""),
        avatar_url=profile.get("avatar_url", ""),
        bio=profile.get("bio", ""),
        created_at=str(profile.get("created_at", "")),
        updated_at=str(profile.get("updated_at", "")),
    )


@api_router.get("/user/interviews", response_model=InterviewHistoryResponse)
async def get_interviews(current_user=Depends(get_current_user)):
    user_id = current_user.id
    collection = db["interviews"]
    cursor = collection.find({"user_id": user_id}).sort("created_at", -1).limit(50)
    interviews = []
    async for doc in cursor:
        interviews.append(InterviewSummary(
            id=str(doc["_id"]),
            jobRole=doc.get("jobRole", ""),
            experienceLevel=doc.get("experienceLevel", ""),
            durationMinutes=doc.get("durationMinutes", 0),
            overallScore=doc.get("overallScore", 0),
            completedAt=str(doc.get("created_at", "")),
        ))
    return InterviewHistoryResponse(interviews=interviews, total=len(interviews))


@api_router.get("/user/dashboard-stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user=Depends(get_current_user)):
    user_id = current_user.id
    collection = db["interviews"]
    cursor = collection.find({"user_id": user_id}).sort("created_at", -1).limit(50)
    interviews = []
    async for doc in cursor:
        interviews.append(doc)

    if not interviews:
        return DashboardStats(
            totalInterviews=0,
            averageScore=0.0,
            bestScore=0,
            worstScore=0,
            totalPracticeMinutes=0,
            recentScores=[],
            scoreDistribution={},
            skillAverages={},
        )

    scores = [i.get("overallScore", 0) for i in interviews]
    report_scores = [i.get("report", {}).get("skills", {}) for i in interviews if i.get("report")]
    total_minutes = sum(i.get("durationMinutes", 0) for i in interviews)

    skill_avgs = {}
    if report_scores:
        for key in ("technical", "communication", "problemSolving", "confidence"):
            vals = [s.get(key, 0) for s in report_scores if s.get(key) is not None]
            skill_avgs[key] = round(sum(vals) / len(vals), 1) if vals else 0

    dist = {"0-25": 0, "26-50": 0, "51-75": 0, "76-100": 0}
    for s in scores:
        if s <= 25: dist["0-25"] += 1
        elif s <= 50: dist["26-50"] += 1
        elif s <= 75: dist["51-75"] += 1
        else: dist["76-100"] += 1

    return DashboardStats(
        totalInterviews=len(interviews),
        averageScore=round(sum(scores) / len(scores), 1),
        bestScore=max(scores),
        worstScore=min(scores),
        totalPracticeMinutes=total_minutes,
        recentScores=scores[:10][::-1],
        scoreDistribution=dist,
        skillAverages=skill_avgs,
    )


def _build_feedback_prompt(req: FeedbackRequest) -> str:
    turns = "\n".join(
        f"{t.role.upper()}: {t.text}" for t in req.transcript if t.text and t.text.strip()
    )
    if not turns:
        turns = "(No transcript captured.)"

    schema_example = {
        "overallScore": 0,
        "skills": {
            "technical": 0,
            "communication": 0,
            "problemSolving": 0,
            "confidence": 0,
        },
        "strengths": ["..."],
        "improvements": ["..."],
        "questionEvaluations": [
            {
                "question": "...",
                "answerSummary": "...",
                "score": 0,
                "feedback": "...",
            }
        ],
        "finalRecommendation": "Strong Hire | Hire | Lean Hire | No Hire",
        "learningSuggestions": ["..."],
        "summary": "2-3 sentence executive summary of the interview.",
    }

    return f"""You are a senior technical hiring manager and interview coach.
Analyze the following mock interview transcript and produce a rigorous, structured evaluation.

Candidate context:
- Job role: {req.jobRole}
- Experience level: {req.experienceLevel}
- Target interview duration: {req.durationMinutes} minutes

Transcript (ASSISTANT is the interviewer, USER is the candidate):
---
{turns}
---

Return ONLY a single valid JSON object matching EXACTLY this schema (all fields required, scores are integers 0-100):

{json.dumps(schema_example, indent=2)}

Rules:
- Base every score and comment on evidence from the transcript. If the candidate did not answer a question, note it.
- Be honest and specific. Avoid generic filler.
- "questionEvaluations" must include every substantive question the interviewer asked (skip pleasantries).
- "finalRecommendation" MUST be one of: "Strong Hire", "Hire", "Lean Hire", "No Hire".
- "learningSuggestions" should be actionable next steps (topics, resources, practice areas).
- Output must be pure JSON, no markdown fences, no commentary.
"""


def _extract_json(text: str) -> dict:
    """Extract the first JSON object from a string (handles ```json fences and stray text)."""
    if not text:
        raise ValueError("Empty LLM response")
    # Strip common code fences
    fence = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, flags=re.DOTALL)
    if fence:
        return json.loads(fence.group(1))
    # Find first { ... last }
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("No JSON object found in LLM response")
    return json.loads(text[start : end + 1])


def _fallback_report(req: FeedbackRequest, reason: str) -> FeedbackReport:
    """Local heuristic fallback so the UI is never broken if the LLM call fails."""
    user_turns = [t for t in req.transcript if t.role == "user" and t.text.strip()]
    assistant_turns = [t for t in req.transcript if t.role == "assistant" and t.text.strip()]
    answered = len(user_turns)
    asked = len(assistant_turns)
    base = 50 if answered else 20
    return FeedbackReport(
        overallScore=base,
        skills=SkillScores(technical=base, communication=base, problemSolving=base, confidence=base),
        strengths=["Attempted the interview end-to-end."] if answered else [],
        improvements=[
            "Automatic scoring is unavailable right now. Please configure OPENROUTER_API_KEY.",
            reason,
        ],
        questionEvaluations=[
            QuestionEvaluation(
                question=(assistant_turns[i].text[:200] if i < asked else "(question)"),
                answerSummary=(user_turns[i].text[:200] if i < answered else "No answer captured."),
                score=base,
                feedback="Automated evaluation unavailable.",
            )
            for i in range(min(max(asked, answered), 5))
        ],
        finalRecommendation="Lean Hire",
        learningSuggestions=[
            "Practice with structured frameworks (STAR for behavioral).",
            "Rehearse concise, example-driven answers under a time constraint.",
        ],
        summary=f"Mock interview for {req.jobRole} ({req.experienceLevel}) completed. Detailed AI evaluation is unavailable.",
    )


async def _try_get_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
    if not supabase:
        return None
    try:
        resp = supabase.auth.get_user(token)
        return resp.user
    except Exception:
        return None


@api_router.post("/interview/feedback", response_model=FeedbackReport)
async def generate_feedback(req: FeedbackRequest, current_user=Depends(_try_get_user)):
    if not req.transcript:
        raise HTTPException(status_code=400, detail="Transcript is empty.")

    if not OPENROUTER_API_KEY:
        logger.warning("OPENROUTER_API_KEY missing, returning fallback report.")
        report = _fallback_report(req, "OPENROUTER_API_KEY is not configured on the server.")
    else:
        prompt = _build_feedback_prompt(req)
        try:
            oai_client = OpenAI(
                api_key=OPENROUTER_API_KEY,
                base_url="https://openrouter.ai/api/v1",
            )
            completion = oai_client.chat.completions.create(
                model=OPENROUTER_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a strict, expert interview evaluator. You always respond with valid JSON only.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
                max_tokens=2048,
                extra_headers={
                    "HTTP-Referer": "https://voice-interview-demo.preview.emergentagent.com",
                    "X-Title": "AI Voice Mock Interview",
                },
            )
            raw = completion.choices[0].message.content or ""
            data = _extract_json(raw)
            report = FeedbackReport(**data)
        except Exception as e:
            logger.exception("Feedback generation failed")
            report = _fallback_report(req, f"LLM error: {type(e).__name__}: {str(e)[:200]}")

    if current_user:
        try:
            interviews_coll = db["interviews"]
            await interviews_coll.insert_one({
                "user_id": current_user.id,
                "jobRole": req.jobRole,
                "experienceLevel": req.experienceLevel,
                "durationMinutes": req.durationMinutes,
                "transcript": [t.model_dump() for t in req.transcript],
                "report": report.model_dump(),
                "overallScore": report.overallScore,
                "created_at": datetime.utcnow(),
            })
        except Exception as e:
            logger.warning(f"Failed to save interview history: {e}")

    return report


# Mount router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
