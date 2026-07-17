import json
import re
import traceback
from types import SimpleNamespace
from datetime import datetime, timezone
from fastapi import HTTPException
from openai import AsyncOpenAI

from config import logger, OPENROUTER_API_KEY, OPENROUTER_MODEL, supabase
from models import FeedbackRequest, FeedbackReport, SkillScores, QuestionEvaluation, PLAN_LIMITS
from routes_user import consume_interview_credit, refund_interview_credit, check_interview_quota


def ensure_user_profile(current_user) -> None:
    if not supabase or not current_user:
        logger.warning("ensure_user_profile: supabase client or current_user is None, skipping")
        return

    user_id = getattr(current_user, "id", None)
    email = getattr(current_user, "email", "") or ""
    name = getattr(current_user, "name", "") or ""
    if not user_id:
        logger.warning("ensure_user_profile: user_id is empty, skipping")
        return

    display_name = name or (email.split("@")[0] if email else f"User_{str(user_id)[:8]}")

    try:
        existing = supabase.table("user_profiles").select("*").eq("user_id", user_id).execute()
        if existing.data:
            needs_update = (
                existing.data[0].get("email", "") != email or
                existing.data[0].get("display_name", "") != display_name
            )
            if needs_update:
                supabase.table("user_profiles").update({
                    "email": email,
                    "display_name": display_name,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }).eq("user_id", user_id).execute()
                logger.info(f"Updated user profile for {user_id}: email={email}, name={display_name}")
            else:
                logger.info(f"User profile already up-to-date for {user_id}")
            return

        supabase.table("user_profiles").insert({
            "user_id": user_id,
            "email": email,
            "display_name": display_name,
            "avatar_url": "",
            "bio": "",
        }).execute()
        logger.info(f"Created user profile for {user_id} with display_name={display_name}")
    except Exception as e:
        logger.error(f"Failed to ensure user profile for {user_id}: {e}\n{traceback.format_exc()}")
        raise


def build_interview_insert_payload(req: FeedbackRequest, report: FeedbackReport, current_user) -> dict:
    return {
        "user_id": current_user.id,
        "job_role": req.jobRole,
        "experience_level": req.experienceLevel,
        "duration_minutes": req.durationMinutes,
        "overall_score": report.overallScore,
        "final_recommendation": report.finalRecommendation,
        "summary": report.summary,
        "report": report.model_dump(),
        "transcript": [t.model_dump() for t in req.transcript],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


def _try_insert(table: str, data, label: str = ""):
    try:
        supabase.table(table).insert(data).execute()
        logger.info(f"  ✓ {table}{' (' + label + ')' if label else ''}")
        return True
    except Exception as e:
        logger.warning(f"  ✗ {table}{' (' + label + ')' if label else ''}: {e}")
        return False


def save_normalized_data(req: FeedbackRequest, report: FeedbackReport, interview_id: str):
    logger.info(f"Saving normalized data for interview {interview_id}")

    transcript_turns_data = [
        {
            "interview_id": interview_id,
            "role": t.role,
            "text": t.text,
            "timestamp": t.timestamp or 0,
        }
        for t in req.transcript if t.text and t.text.strip()
    ]
    if transcript_turns_data:
        _try_insert("transcript_turns", transcript_turns_data, f"{len(transcript_turns_data)} turns")
    else:
        logger.info("  - transcript_turns: no turns to save")

    _try_insert("skill_scores", {
        "interview_id": interview_id,
        "technical": report.skills.technical,
        "communication": report.skills.communication,
        "problem_solving": report.skills.problemSolving,
        "confidence": report.skills.confidence,
    }, "scores")

    if report.questionEvaluations:
        _try_insert("question_evaluations", [
            {
                "interview_id": interview_id,
                "question": q.question,
                "answer_summary": q.answerSummary,
                "score": q.score,
                "feedback": q.feedback,
            }
            for q in report.questionEvaluations
        ], f"{len(report.questionEvaluations)} evaluations")
    else:
        logger.info("  - question_evaluations: none to save")

    if report.strengths:
        _try_insert("interview_strengths", [
            {"interview_id": interview_id, "text": s} for s in report.strengths
        ], f"{len(report.strengths)} strengths")
    else:
        logger.info("  - interview_strengths: none to save")

    if report.improvements:
        _try_insert("interview_improvements", [
            {"interview_id": interview_id, "text": s} for s in report.improvements
        ], f"{len(report.improvements)} improvements")
    else:
        logger.info("  - interview_improvements: none to save")

    if report.learningSuggestions:
        _try_insert("learning_suggestions", [
            {"interview_id": interview_id, "text": s} for s in report.learningSuggestions
        ], f"{len(report.learningSuggestions)} suggestions")
    else:
        logger.info("  - learning_suggestions: none to save")


def build_feedback_prompt(req: FeedbackRequest) -> str:
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


def extract_json(text: str) -> dict:
    if not text:
        raise ValueError("Empty LLM response")
    fence = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, flags=re.DOTALL)
    if fence:
        return json.loads(fence.group(1))
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("No JSON object found in LLM response")
    return json.loads(text[start: end + 1])


def fallback_report(req: FeedbackRequest, reason: str) -> FeedbackReport:
    user_turns = [t for t in req.transcript if t.role == "user" and t.text.strip()]
    assistant_turns = [t for t in req.transcript if t.role == "assistant" and t.text.strip()]
    answered = len(user_turns)
    asked = len(assistant_turns)
    base = 50 if answered else 20
    count = min(max(asked, answered), 5)
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
            for i in range(count)
        ],
        finalRecommendation="Lean Hire",
        learningSuggestions=[
            "Practice with structured frameworks (STAR for behavioral).",
            "Rehearse concise, example-driven answers under a time constraint.",
        ],
        summary=f"Mock interview for {req.jobRole} ({req.experienceLevel}) completed. Detailed AI evaluation is unavailable.",
    )


def _resolve_user(current_user, req: FeedbackRequest):
    if current_user:
        return current_user
    if req.userId:
        from deps import normalize_user_id
        user_id = normalize_user_id(req.userId)
        if user_id:
            logger.info(f"Using fallback user info from request body: {user_id}")
            return SimpleNamespace(
                id=user_id,
                email=req.email or "",
                name=req.displayName or ""
            )
    return None


async def generate_and_save_feedback(req: FeedbackRequest, current_user=None) -> FeedbackReport:
    if not OPENROUTER_API_KEY:
        logger.warning("OPENROUTER_API_KEY missing, returning fallback report.")
        report = fallback_report(req, "OPENROUTER_API_KEY is not configured on the server.")
    else:
        prompt = build_feedback_prompt(req)
        try:
            oai_client = AsyncOpenAI(
                api_key=OPENROUTER_API_KEY,
                base_url="https://openrouter.ai/api/v1",
                timeout=60.0,
            )
            completion = await oai_client.chat.completions.create(
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
                    "HTTP-Referer": "https://dash-improve.preview.emergentagent.com",
                    "X-Title": "AI Voice Mock Interview",
                },
            )
            raw = completion.choices[0].message.content or ""
            data = extract_json(raw)
            report = FeedbackReport(**data)
        except Exception as e:
            logger.exception("Feedback generation failed")
            report = fallback_report(req, f"LLM error: {type(e).__name__}: {str(e)[:200]}")

    if current_user:
        try:
            check_interview_quota(current_user.id)
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to check subscription for {current_user.id}: {e}")

    current_user = _resolve_user(current_user, req)

    if current_user:
        try:
            logger.info(f"Saving interview for user {current_user.id}")
            ensure_user_profile(current_user)
            payload = build_interview_insert_payload(req, report, current_user)
            jsonb_report = payload.pop("report", None)
            jsonb_transcript = payload.pop("transcript", None)
            logger.info(f"Interview payload built: {json.dumps(payload)}")
            result = supabase.table("interviews").insert(payload).execute()
            if result.data:
                    interview_id = result.data[0]["id"]

                    # Attempt to store JSONB report/transcript separately (columns may not exist in all deployments)
                    if jsonb_report is not None or jsonb_transcript is not None:
                        try:
                            update_data = {}
                            if jsonb_report is not None:
                                update_data["report"] = jsonb_report
                            if jsonb_transcript is not None:
                                update_data["transcript"] = jsonb_transcript
                            supabase.table("interviews").update(update_data).eq("id", interview_id).execute()
                        except Exception as jsonb_err:
                            logger.warning(f"Could not set JSONB columns (may not exist in schema): {jsonb_err}")

                    logger.info(f"Interview {interview_id} saved, now saving normalized data")
                    save_normalized_data(req, report, interview_id)

                    # Atomically consume interview credit
                    credit_ok = consume_interview_credit(current_user.id)
                    if credit_ok:
                        logger.info(f"Interview credit consumed for user {current_user.id}")
                    else:
                        logger.warning(f"Failed to consume interview credit for user {current_user.id}")
                        refund_interview_credit(current_user.id)

                    logger.info(f"Interview {interview_id} fully saved with normalized data")
            else:
                logger.error(f"Failed to save interview: no data returned. Response: {result}")
                refund_interview_credit(current_user.id)
        except Exception as e:
            logger.error(f"Failed to save interview: {e}\n{traceback.format_exc()}")
            try:
                refund_interview_credit(current_user.id)
            except Exception:
                pass
    else:
        logger.warning("current_user is None, skipping database save")

    return report
