from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import logging
import re
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Literal, Optional
from openai import OpenAI


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection (kept as-is for template compatibility; not used for persistence in MVP)
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# OpenRouter (OpenAI-compatible)
OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY', '')
OPENROUTER_MODEL = os.environ.get('OPENROUTER_MODEL', 'openai/gpt-oss-20b:free')
OPENROUTER_FALLBACK_MODELS = [
    m.strip()
    for m in os.environ.get('OPENROUTER_FALLBACK_MODELS', '').split(',')
    if m.strip()
]

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


@api_router.post("/interview/feedback", response_model=FeedbackReport)
async def generate_feedback(req: FeedbackRequest):
    if not req.transcript:
        raise HTTPException(status_code=400, detail="Transcript is empty.")

    if not OPENROUTER_API_KEY:
        logger.warning("OPENROUTER_API_KEY missing, returning fallback report.")
        return _fallback_report(req, "OPENROUTER_API_KEY is not configured on the server.")

    print("OPENROUTER_API_KEY", OPENROUTER_API_KEY)
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
        return FeedbackReport(**data)
    except Exception as e:
        logger.exception("Feedback generation failed")
        return _fallback_report(req, f"LLM error: {type(e).__name__}: {str(e)[:200]}")


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
