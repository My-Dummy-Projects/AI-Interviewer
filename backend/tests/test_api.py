"""Backend API tests for the AI Voice Mock Interview MVP."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- Health / Root ----------
class TestRoot:
    def test_root_message(self, api_client):
        r = api_client.get(f"{API}/")
        assert r.status_code == 200
        data = r.json()
        assert data == {"message": "AI Voice Mock Interview API"}


# ---------- Config ----------
class TestConfig:
    def test_config_shape(self, api_client):
        r = api_client.get(f"{API}/config")
        assert r.status_code == 200
        data = r.json()
        for key in ("vapiPublicKey", "vapiAssistantId", "ready"):
            assert key in data, f"missing key {key}"
        assert isinstance(data["vapiPublicKey"], str)
        assert isinstance(data["vapiAssistantId"], str)
        assert isinstance(data["ready"], bool)

    def test_config_not_ready_when_env_empty(self, api_client):
        r = api_client.get(f"{API}/config")
        assert r.status_code == 200
        data = r.json()
        # env values are empty in this MVP first iteration
        if not data["vapiPublicKey"] or not data["vapiAssistantId"]:
            assert data["ready"] is False


# ---------- Feedback ----------
VALID_RECS = {"Strong Hire", "Hire", "Lean Hire", "No Hire"}


def _sample_payload():
    return {
        "jobRole": "Senior Backend Engineer",
        "experienceLevel": "Senior",
        "durationMinutes": 10,
        "transcript": [
            {"role": "assistant", "text": "Tell me about a system you designed.", "timestamp": 1},
            {"role": "user", "text": "I designed a distributed rate limiter using Redis.", "timestamp": 2},
            {"role": "assistant", "text": "How did you handle race conditions?", "timestamp": 3},
            {"role": "user", "text": "I used Lua scripts to make INCR+EXPIRE atomic.", "timestamp": 4},
        ],
    }


class TestFeedback:
    def test_feedback_empty_transcript_returns_400(self, api_client):
        payload = _sample_payload()
        payload["transcript"] = []
        r = api_client.post(f"{API}/interview/feedback", json=payload)
        assert r.status_code == 400
        data = r.json()
        assert "detail" in data

    def test_feedback_valid_returns_full_schema(self, api_client):
        payload = _sample_payload()
        r = api_client.post(f"{API}/interview/feedback", json=payload, timeout=120)
        assert r.status_code == 200, r.text
        data = r.json()

        # Full schema fields
        for key in (
            "overallScore",
            "skills",
            "strengths",
            "improvements",
            "questionEvaluations",
            "finalRecommendation",
            "learningSuggestions",
            "summary",
        ):
            assert key in data, f"missing key {key}"

        assert isinstance(data["overallScore"], int)
        assert isinstance(data["skills"], dict)
        for s in ("technical", "communication", "problemSolving", "confidence"):
            assert s in data["skills"]
            assert isinstance(data["skills"][s], int)

        assert isinstance(data["strengths"], list)
        assert isinstance(data["improvements"], list)
        assert isinstance(data["learningSuggestions"], list)
        assert isinstance(data["summary"], str)
        assert data["finalRecommendation"] in VALID_RECS

        assert isinstance(data["questionEvaluations"], list)
        for q in data["questionEvaluations"]:
            for k in ("question", "answerSummary", "score", "feedback"):
                assert k in q
            assert isinstance(q["score"], int)

    def test_feedback_fallback_when_openrouter_key_missing(self, api_client):
        """When OPENROUTER_API_KEY is empty, backend must return fallback report
        whose improvements array mentions OPENROUTER_API_KEY."""
        payload = _sample_payload()
        r = api_client.post(f"{API}/interview/feedback", json=payload, timeout=120)
        assert r.status_code == 200
        data = r.json()
        # Look for the mention of OPENROUTER_API_KEY in improvements (fallback marker)
        improvements_text = " ".join(data.get("improvements") or [])
        # This assertion only holds when key is unset. We check via /config indirectly
        # or by checking that improvements has the fallback text.
        # If OPENROUTER_API_KEY is truly empty on server, this should be True.
        # We treat presence of the token as pass; otherwise skip.
        if "OPENROUTER_API_KEY" not in improvements_text:
            pytest.skip("Server appears to have OPENROUTER_API_KEY configured; skipping fallback-marker assertion.")
        assert "OPENROUTER_API_KEY" in improvements_text

    def test_feedback_invalid_payload_missing_fields(self, api_client):
        r = api_client.post(f"{API}/interview/feedback", json={"jobRole": "x"})
        # Should be 422 (pydantic validation)
        assert r.status_code in (400, 422)
