from types import SimpleNamespace

from feedback import build_interview_insert_payload
from models import FeedbackReport, FeedbackRequest, QuestionEvaluation, SkillScores
from routes_user import normalize_interview_record


def test_build_interview_insert_payload_uses_sql_column_names():
    req = FeedbackRequest(
        jobRole="Senior Backend Engineer",
        experienceLevel="Senior",
        durationMinutes=15,
        transcript=[{"role": "assistant", "text": "Tell me about your experience.", "timestamp": 1}],
    )
    report = FeedbackReport(
        overallScore=82,
        skills=SkillScores(technical=80, communication=85, problemSolving=78, confidence=84),
        strengths=["Clear structure"],
        improvements=["Add more examples"],
        questionEvaluations=[
            QuestionEvaluation(
                question="Tell me about your experience.",
                answerSummary="I described a recent system design.",
                score=82,
                feedback="Strong answer.",
            )
        ],
        finalRecommendation="Hire",
        learningSuggestions=["Practice behavioral stories"],
        summary="Solid interview performance.",
    )
    current_user = SimpleNamespace(id="11111111-1111-1111-1111-111111111111", email="user@example.com")

    payload = build_interview_insert_payload(req, report, current_user)

    assert payload["user_id"] == current_user.id
    assert payload["job_role"] == req.jobRole
    assert payload["experience_level"] == req.experienceLevel
    assert payload["duration_minutes"] == req.durationMinutes
    assert payload["overall_score"] == report.overallScore
    assert payload["final_recommendation"] == report.finalRecommendation
    assert payload["summary"] == report.summary
    assert "transcript" not in payload
    assert "report" not in payload
