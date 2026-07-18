from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime, timezone, timedelta

from config import supabase, logger
from models import (
    UserProfileUpdate, UserProfileResponse,
    InterviewSummary, InterviewHistoryResponse, InterviewDetail,
    DashboardStats, FeedbackEntryRequest, FeedbackEntryResponse,
    SubscriptionResponse, SubscriptionUsageResponse, PLAN_LIMITS, PLAN_RANK,
)
from deps import get_current_user, try_get_user, normalize_user_id
from feedback import ensure_user_profile

api_router_user = APIRouter(prefix="/api/user")


def fetch_transcript(interview_id: str) -> list:
    result = supabase.table("interviews").select("transcript").eq("id", interview_id).execute()
    if result.data and result.data[0].get("transcript"):
        transcript = result.data[0]["transcript"]
        if isinstance(transcript, list) and len(transcript) > 0:
            return transcript

    result = supabase.table("transcript_turns").select("*").eq("interview_id", interview_id).order("timestamp").execute()
    return [
        {"role": t["role"], "text": t["text"], "timestamp": t["timestamp"]}
        for t in (result.data or [])
    ]


def fetch_report(interview_id: str) -> dict:
    result = supabase.table("interviews").select("report").eq("id", interview_id).execute()
    if result.data and result.data[0].get("report"):
        report = result.data[0]["report"]
        if isinstance(report, dict) and report.get("skills") is not None:
            return report

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
    except Exception as e:
        logger.warning(f"get_user_id_candidates: email lookup failed for {email}: {e}")

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
        normalized = normalize_user_id(user_id)
        supabase.table("user_profiles").insert({
            "user_id": normalized,
            "email": email,
            "display_name": display_name,
            "avatar_url": "",
            "bio": "",
        }).execute()
        result = supabase.table("user_profiles").select("*").eq("user_id", normalized).execute()
        profile = (result.data or [{}])[0]
    elif user_id and profile.get("user_id") != user_id:
        try:
            normalized = normalize_user_id(user_id)
            supabase.table("user_profiles").update({"user_id": normalized}).eq("email", email).execute()
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
    user_id = normalize_user_id(current_user.id)
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
async def get_interviews(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user=Depends(get_current_user),
):
    user_id = current_user.id
    email = current_user.email or ""
    candidate_ids = get_user_id_candidates(user_id, email)

    if not candidate_ids:
        return InterviewHistoryResponse(interviews=[], total=0, page=1, page_size=page_size, total_pages=0)

    start = (page - 1) * page_size
    end = start + page_size - 1

    result = supabase.table("interviews").select("*", count="exact").in_("user_id", candidate_ids).order("created_at", desc=True).range(start, end).execute()
    docs = result.data or []
    total = result.count if hasattr(result, "count") else len(docs)

    interviews = [
        InterviewSummary(
            id=doc.get("id", ""),
            jobRole=doc.get("job_role") or doc.get("jobRole") or "",
            experienceLevel=doc.get("experience_level") or doc.get("experienceLevel") or "",
            durationMinutes=int(doc.get("duration_minutes") or doc.get("durationMinutes") or 0),
            overallScore=int(doc.get("overall_score") or doc.get("overallScore") or 0),
            completedAt=str(doc.get("created_at") or doc.get("createdAt") or ""),
        )
        for doc in docs
    ]
    total_pages = max(1, (total + page_size - 1) // page_size)
    return InterviewHistoryResponse(interviews=interviews, total=total, page=page, page_size=page_size, total_pages=total_pages)


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

    ensure_user_profile(current_user)
    created_at = datetime.now(timezone.utc).isoformat()
    result = supabase.table("feedback_entries").insert({
        "user_id": normalize_user_id(current_user.id),
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


def check_and_reset_period(sub: dict) -> dict:
    """If the period has expired, reset usage to zero for paid plans."""
    if not sub:
        return sub
    plan = sub.get("plan", "free")
    if plan == "free":
        return sub
    period_end = sub.get("current_period_end")
    if not period_end:
        return sub
    try:
        end = datetime.fromisoformat(str(period_end).replace("Z", "+00:00"))
        if datetime.now(timezone.utc) > end:
            plan_config = PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])
            supabase.table("user_subscriptions").update({
                "interviews_used": 0,
                "interviews_allowed": plan_config["interviews_allowed"],
                "current_period_start": datetime.now(timezone.utc).isoformat(),
                "current_period_end": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", sub["id"]).execute()
            sub["interviews_used"] = 0
            sub["interviews_allowed"] = plan_config["interviews_allowed"]
            logger.info(f"Subscription period reset for user {sub.get('user_id')}: plan={plan}")
    except (ValueError, TypeError):
        pass
    return sub


def get_or_create_subscription(user_id: str) -> dict:
    user_id = normalize_user_id(user_id)
    result = supabase.table("user_subscriptions").select("*").eq("user_id", user_id).execute()
    if result.data:
        sub = result.data[0]
        sub = check_and_reset_period(sub)
        return sub

    plan_config = PLAN_LIMITS.get("free", {"interviews_allowed": 2, "max_duration_minutes": 15})
    supabase.table("user_subscriptions").insert({
        "user_id": user_id,
        "plan": "free",
        "interviews_allowed": plan_config["interviews_allowed"],
        "interviews_used": 0,
        "status": "active",
    }).execute()
    result = supabase.table("user_subscriptions").select("*").eq("user_id", user_id).execute()
    return result.data[0] if result.data else {}


def check_interview_quota(user_id: str) -> dict:
    """Check if user can start an interview. Returns sub dict or raises 403."""
    sub = get_or_create_subscription(user_id)
    allowed = sub.get("interviews_allowed", 0)
    used = sub.get("interviews_used", 0)
    remaining = allowed - used
    if remaining <= 0:
        plan = sub.get("plan", "free")
        raise HTTPException(
            status_code=403,
            detail=f"You have used all {allowed} interviews on your {plan} plan. Upgrade to continue.",
        )
    return sub


def consume_interview_credit(user_id: str):
    """Atomically consume one interview credit. Returns True on success."""
    user_id = normalize_user_id(user_id)
    for _ in range(3):
        sub_result = supabase.table("user_subscriptions").select("interviews_used, interviews_allowed").eq("user_id", user_id).execute()
        if not sub_result.data:
            return False
        current_used = sub_result.data[0]["interviews_used"]
        allowed = sub_result.data[0]["interviews_allowed"]
        if current_used >= allowed:
            return False
        result = supabase.table("user_subscriptions").update({
            "interviews_used": current_used + 1,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("user_id", user_id).eq("interviews_used", current_used).execute()
        if result.data:
            return True
    return False


def refund_interview_credit(user_id: str):
    """Refund one interview credit (for abandoned interviews)."""
    user_id = normalize_user_id(user_id)
    sub_result = supabase.table("user_subscriptions").select("interviews_used").eq("user_id", user_id).execute()
    if not sub_result.data:
        return
    current_used = sub_result.data[0]["interviews_used"]
    if current_used > 0:
        supabase.table("user_subscriptions").update({
            "interviews_used": current_used - 1,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("user_id", user_id).execute()
        logger.info(f"Refunded 1 interview credit for user {user_id}")


@api_router_user.get("/subscription", response_model=SubscriptionResponse)
async def get_subscription(current_user=Depends(get_current_user)):
    sub = get_or_create_subscription(current_user.id)
    plan = sub.get("plan", "free")
    allowed = sub.get("interviews_allowed", 2)
    used = sub.get("interviews_used", 0)
    plan_config = PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])
    return SubscriptionResponse(
        plan=plan,
        interviewsAllowed=allowed,
        interviewsUsed=used,
        interviewsRemaining=max(0, allowed - used),
        status=sub.get("status", "active"),
        currentPeriodStart=str(sub.get("current_period_start") or ""),
        currentPeriodEnd=str(sub.get("current_period_end") or ""),
        maxDurationMinutes=plan_config["max_duration_minutes"],
        hasAnalytics=plan_config["has_analytics"],
        hasLearningPlan=plan_config["has_learning_plan"],
        isLifetime=plan_config["lifetime"],
    )


@api_router_user.get("/subscription/usage", response_model=SubscriptionUsageResponse)
async def get_subscription_usage(current_user=Depends(get_current_user)):
    try:
        sub = check_interview_quota(current_user.id)
        allowed = sub.get("interviews_allowed", 0)
        used = sub.get("interviews_used", 0)
        remaining = allowed - used
        can_start = remaining > 0
    except HTTPException:
        allowed = 0
        used = 0
        remaining = 0
        can_start = False
    return SubscriptionUsageResponse(
        interviewsAllowed=allowed,
        interviewsUsed=used,
        interviewsRemaining=max(0, remaining),
        canStartInterview=can_start,
    )


@api_router_user.get("/dashboard-stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user=Depends(get_current_user)):
    user_id = current_user.id
    email = current_user.email or ""
    candidate_ids = get_user_id_candidates(user_id, email)

    if not candidate_ids:
        interviews = []
    else:
        result = supabase.table("interviews").select("*").in_("user_id", candidate_ids).order("created_at", desc=True).limit(50).execute()
        interviews = result.data or []

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
