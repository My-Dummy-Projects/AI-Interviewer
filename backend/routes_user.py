from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone

from config import supabase
from models import (
    UserProfileUpdate, UserProfileResponse,
    InterviewSummary, InterviewHistoryResponse, InterviewDetail,
    DashboardStats, FeedbackEntryRequest, FeedbackEntryResponse,
)
from deps import get_current_user, normalize_user_id

api_router_user = APIRouter(prefix="/api/user")


def fetch_transcript(interview_id: str) -> list:
    result = supabase.table("transcript_turns").select("*").eq("interview_id", interview_id).order("timestamp").execute()
    return [
        {"role": t["role"], "text": t["text"], "timestamp": t["timestamp"]}
        for t in (result.data or [])
    ]


def fetch_report(interview_id: str) -> dict:
    report = {
        "skills": {"technical": 0, "communication": 0, "problemSolving": 0, "confidence": 0},
        "strengths": [],
        "improvements": [],
        "questionEvaluations": [],
        "learningSuggestions": [],
    }

    skills_result = supabase.table("skill_scores").select("*").eq("interview_id", interview_id).execute()
    if skills_result.data:
        s = skills_result.data[0]
        report["skills"] = {
            "technical": s.get("technical", 0),
            "communication": s.get("communication", 0),
            "problemSolving": s.get("problem_solving", 0),
            "confidence": s.get("confidence", 0),
        }

    strengths_result = supabase.table("interview_strengths").select("text").eq("interview_id", interview_id).execute()
    report["strengths"] = [r["text"] for r in (strengths_result.data or [])]

    improvements_result = supabase.table("interview_improvements").select("text").eq("interview_id", interview_id).execute()
    report["improvements"] = [r["text"] for r in (improvements_result.data or [])]

    eval_result = supabase.table("question_evaluations").select("*").eq("interview_id", interview_id).execute()
    report["questionEvaluations"] = [
        {
            "question": e.get("question", ""),
            "answerSummary": e.get("answer_summary", ""),
            "score": e.get("score", 0),
            "feedback": e.get("feedback", ""),
        }
        for e in (eval_result.data or [])
    ]

    suggestions_result = supabase.table("learning_suggestions").select("text").eq("interview_id", interview_id).execute()
    report["learningSuggestions"] = [r["text"] for r in (suggestions_result.data or [])]

    return report


def get_user_id_candidates(user_id: str, email: str = "", client=None) -> list[str]:
    candidates = []
    normalized = normalize_user_id(user_id or "")
    if normalized:
        candidates.append(normalized)

    if not email:
        return candidates

    lookup_client = client or supabase
    if not lookup_client:
        return candidates

    try:
        profile_rows = lookup_client.table("user_profiles").select("user_id").eq("email", email).execute()
        for row in profile_rows.data or []:
            candidate = normalize_user_id(row.get("user_id") or "")
            if candidate and candidate not in candidates:
                candidates.append(candidate)
    except Exception:
        pass

    return candidates


def normalize_interview_record(record: dict) -> dict:
    if not isinstance(record, dict):
        return {}

    interview_id = record.get("id", "")
    job_role = record.get("jobRole") or record.get("job_role") or ""
    experience_level = record.get("experienceLevel") or record.get("experience_level") or ""
    duration_minutes = record.get("durationMinutes")
    if duration_minutes is None:
        duration_minutes = record.get("duration_minutes", 0)
    overall_score = record.get("overallScore")
    if overall_score is None:
        overall_score = record.get("overall_score", 0)
    completed_at = record.get("created_at") or record.get("createdAt") or ""
    final_recommendation = record.get("finalRecommendation") or record.get("final_recommendation") or ""
    summary = record.get("summary", "")

    report = fetch_report(interview_id)
    report.update({
        "overallScore": int(overall_score or 0),
        "finalRecommendation": final_recommendation,
        "summary": summary,
    })

    return {
        "id": interview_id,
        "jobRole": job_role,
        "experienceLevel": experience_level,
        "durationMinutes": int(duration_minutes or 0),
        "overallScore": int(overall_score or 0),
        "transcript": fetch_transcript(interview_id),
        "report": report,
        "completedAt": str(completed_at),
        "finalRecommendation": final_recommendation,
        "summary": summary,
    }


@api_router_user.get("/profile", response_model=UserProfileResponse)
async def get_profile(current_user=Depends(get_current_user)):
    user_id = current_user.id
    email = current_user.email or ""
    candidate_ids = get_user_id_candidates(user_id, email)

    profile = None
    for candidate in candidate_ids:
        result = supabase.table("user_profiles").select("*").eq("user_id", candidate).execute()
        if result.data:
            profile = result.data[0]
            break

    if not profile:
        name = getattr(current_user, "name", "") or ""
        display_name = name or (email.split("@")[0] if email else f"User_{user_id[:8]}")
        supabase.table("user_profiles").insert({
            "user_id": user_id,
            "email": email,
            "display_name": display_name,
            "avatar_url": "",
            "bio": "",
        }).execute()
        result = supabase.table("user_profiles").select("*").eq("user_id", user_id).execute()
        profile = (result.data or [{}])[0]
    elif user_id and profile.get("user_id") != user_id:
        try:
            supabase.table("user_profiles").update({"user_id": user_id}).eq("email", email).execute()
        except Exception:
            pass

    return UserProfileResponse(
        id=profile["id"],
        user_id=profile.get("user_id", user_id),
        email=profile.get("email", current_user.email),
        display_name=profile.get("display_name", current_user.email.split("@")[0]),
        avatar_url=profile.get("avatar_url", ""),
        bio=profile.get("bio", ""),
        created_at=str(profile.get("created_at", "")),
        updated_at=str(profile.get("updated_at", "")),
    )


@api_router_user.put("/profile", response_model=UserProfileResponse)
async def update_profile(req: UserProfileUpdate, current_user=Depends(get_current_user)):
    user_id = current_user.id
    update_data = {k: v for k, v in req.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    update_data["updated_at"] = str(datetime.now(timezone.utc))

    existing = supabase.table("user_profiles").select("*").eq("user_id", user_id).execute()
    if existing.data:
        supabase.table("user_profiles").update(update_data).eq("user_id", user_id).execute()
    else:
        update_data["user_id"] = user_id
        update_data["email"] = current_user.email
        update_data.setdefault("display_name", current_user.email.split("@")[0])
        supabase.table("user_profiles").insert(update_data).execute()

    result = supabase.table("user_profiles").select("*").eq("user_id", user_id).execute()
    profile = result.data[0]
    return UserProfileResponse(
        id=profile["id"],
        user_id=profile.get("user_id", user_id),
        email=profile.get("email", current_user.email),
        display_name=profile.get("display_name", ""),
        avatar_url=profile.get("avatar_url", ""),
        bio=profile.get("bio", ""),
        created_at=str(profile.get("created_at", "")),
        updated_at=str(profile.get("updated_at", "")),
    )


@api_router_user.get("/interviews", response_model=InterviewHistoryResponse)
async def get_interviews(current_user=Depends(get_current_user)):
    user_id = current_user.id
    email = current_user.email or ""
    candidate_ids = get_user_id_candidates(user_id, email)

    docs = []
    for candidate in candidate_ids:
        result = supabase.table("interviews").select("*").eq("user_id", candidate).order("created_at", desc=True).limit(50).execute()
        docs.extend(result.data or [])

    seen_ids = set()
    unique_docs = []
    for doc in docs:
        doc_id = doc.get("id")
        if doc_id and doc_id not in seen_ids:
            seen_ids.add(doc_id)
            unique_docs.append(doc)

    interviews = [
        InterviewSummary(
            id=doc.get("id", ""),
            jobRole=doc.get("job_role") or doc.get("jobRole") or "",
            experienceLevel=doc.get("experience_level") or doc.get("experienceLevel") or "",
            durationMinutes=int(doc.get("duration_minutes") or doc.get("durationMinutes") or 0),
            overallScore=int(doc.get("overall_score") or doc.get("overallScore") or 0),
            completedAt=str(doc.get("created_at") or doc.get("createdAt") or ""),
        )
        for doc in unique_docs
    ]
    return InterviewHistoryResponse(interviews=interviews, total=len(interviews))


@api_router_user.get("/interviews/{interview_id}", response_model=InterviewDetail)
async def get_interview(interview_id: str, current_user=Depends(get_current_user)):
    user_id = current_user.id
    email = current_user.email or ""
    candidate_ids = get_user_id_candidates(user_id, email)

    result = supabase.table("interviews").select("*").eq("id", interview_id).execute()
    docs = result.data or []
    doc = None
    for candidate in candidate_ids:
        for row in docs:
            if row.get("user_id") == candidate:
                doc = row
                break
        if doc:
            break

    if not doc:
        raise HTTPException(status_code=404, detail="Interview not found")
    normalized = normalize_interview_record(doc)
    return InterviewDetail(
        id=normalized["id"],
        jobRole=normalized["jobRole"],
        experienceLevel=normalized["experienceLevel"],
        durationMinutes=normalized["durationMinutes"],
        overallScore=normalized["overallScore"],
        transcript=normalized["transcript"],
        report=normalized["report"],
        completedAt=normalized["completedAt"],
    )


@api_router_user.post("/feedback", response_model=FeedbackEntryResponse)
async def submit_tool_feedback(req: FeedbackEntryRequest, current_user=Depends(get_current_user)):
    if not req.feedback or not req.feedback.strip():
        raise HTTPException(status_code=400, detail="Feedback text is required")

    created_at = datetime.utcnow().isoformat()
    result = supabase.table("feedback_entries").insert({
        "user_id": current_user.id,
        "email": getattr(current_user, "email", ""),
        "feedback": req.feedback.strip(),
        "rating": req.rating,
        "category": req.category or "",
        "created_at": created_at,
    }).execute()

    inserted = (result.data or [{}])[0]
    return FeedbackEntryResponse(
        id=inserted.get("id", ""),
        feedback=req.feedback.strip(),
        rating=req.rating,
        category=req.category,
        createdAt=created_at,
    )


@api_router_user.get("/dashboard-stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user=Depends(get_current_user)):
    user_id = current_user.id
    email = current_user.email or ""
    candidate_ids = get_user_id_candidates(user_id, email)

    interviews = []
    for candidate in candidate_ids:
        result = supabase.table("interviews").select("*").eq("user_id", candidate).order("created_at", desc=True).limit(50).execute()
        interviews.extend(result.data or [])

    seen_ids = set()
    unique_interviews = []
    for doc in interviews:
        doc_id = doc.get("id")
        if doc_id and doc_id not in seen_ids:
            seen_ids.add(doc_id)
            unique_interviews.append(doc)

    interviews = unique_interviews

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

    scores = [int(doc.get("overall_score", 0) or 0) for doc in interviews]
    total_minutes = sum(int(doc.get("duration_minutes", 0) or 0) for doc in interviews)
    interview_ids = [doc["id"] for doc in interviews]

    skill_avgs = {}
    if interview_ids:
        skill_result = supabase.table("skill_scores").select("*").in_("interview_id", interview_ids).execute()
        skill_rows = skill_result.data or []
        if skill_rows:
            for key, col in [("technical", "technical"), ("communication", "communication"),
                             ("problemSolving", "problem_solving"), ("confidence", "confidence")]:
                vals = [r.get(col, 0) for r in skill_rows if r.get(col) is not None]
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
