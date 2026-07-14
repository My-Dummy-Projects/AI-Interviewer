import json
import re
from datetime import datetime
from openai import OpenAI

from config import logger, OPENROUTER_API_KEY, OPENROUTER_MODEL, db
from models import FeedbackRequest, FeedbackReport, SkillScores, QuestionEvaluation


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


async def generate_and_save_feedback(req: FeedbackRequest, current_user=None) -> FeedbackReport:
    if not OPENROUTER_API_KEY:
        logger.warning("OPENROUTER_API_KEY missing, returning fallback report.")
        report = fallback_report(req, "OPENROUTER_API_KEY is not configured on the server.")
    else:
        prompt = build_feedback_prompt(req)
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
