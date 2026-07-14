from fastapi import APIRouter, Depends, HTTPException
from bson.objectid import ObjectId
from datetime import datetime

from config import db, supabase
from models import (
    UserProfileUpdate, UserProfileResponse,
    InterviewSummary, InterviewHistoryResponse, InterviewDetail,
    DashboardStats,
)
from deps import get_current_user

api_router_user = APIRouter(prefix="/api/user")


@api_router_user.get("/profile", response_model=UserProfileResponse)
async def get_profile(current_user=Depends(get_current_user)):
    user_id = current_user.id
    result = supabase.table("user_profiles").select("*").eq("user_id", user_id).execute()
    if not result.data:
        supabase.table("user_profiles").insert({
            "user_id": user_id,
            "email": current_user.email,
            "display_name": current_user.email.split("@")[0],
            "avatar_url": "",
            "bio": "",
        }).execute()
        result = supabase.table("user_profiles").select("*").eq("user_id", user_id).execute()
    profile = result.data[0]
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
    update_data["updated_at"] = str(datetime.utcnow())

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


@api_router_user.get("/interviews/{interview_id}", response_model=InterviewDetail)
async def get_interview(interview_id: str, current_user=Depends(get_current_user)):
    collection = db["interviews"]
    doc = await collection.find_one({"_id": ObjectId(interview_id), "user_id": current_user.id})
    if not doc:
        raise HTTPException(status_code=404, detail="Interview not found")
    return InterviewDetail(
        id=str(doc["_id"]),
        jobRole=doc.get("jobRole", ""),
        experienceLevel=doc.get("experienceLevel", ""),
        durationMinutes=doc.get("durationMinutes", 0),
        overallScore=doc.get("overallScore", 0),
        transcript=doc.get("transcript", []),
        report=doc.get("report", {}),
        completedAt=str(doc.get("created_at", "")),
    )


@api_router_user.get("/dashboard-stats", response_model=DashboardStats)
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
