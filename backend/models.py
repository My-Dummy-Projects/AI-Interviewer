from pydantic import BaseModel, field_validator
from typing import List, Literal, Optional
from types import MappingProxyType


class TranscriptTurn(BaseModel):
    role: Literal["user", "assistant"]
    text: str
    timestamp: Optional[int] = None

    @field_validator("text")
    @classmethod
    def limit_text_length(cls, v):
        if len(v) > 100_000:
            raise ValueError("Transcript turn text exceeds maximum length of 100,000 characters")
        return v


class FeedbackRequest(BaseModel):
    jobRole: str
    experienceLevel: str
    durationMinutes: int
    transcript: List[TranscriptTurn]
    userId: Optional[str] = None
    email: Optional[str] = None
    displayName: Optional[str] = None


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


class FeedbackEntryRequest(BaseModel):
    feedback: str
    rating: Optional[int] = None
    category: Optional[str] = None

    @field_validator("rating")
    @classmethod
    def validate_rating(cls, v):
        if v is not None and (v < 1 or v > 5):
            raise ValueError("Rating must be between 1 and 5")
        return v


class FeedbackEntryResponse(BaseModel):
    id: str
    feedback: str
    rating: Optional[int] = None
    category: Optional[str] = None
    createdAt: str


class ConfigResponse(BaseModel):
    vapiPublicKey: str
    vapiAssistantId: str
    ready: bool


class SignUpRequest(BaseModel):
    email: str
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class SignInRequest(BaseModel):
    email: str
    password: str


class ResetPasswordRequest(BaseModel):
    email: str
    redirect_to: Optional[str] = None


class UpdatePasswordRequest(BaseModel):
    access_token: str
    new_password: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class AuthResponse(BaseModel):
    user: dict
    session: dict


class UserProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None


class UserProfileResponse(BaseModel):
    id: str
    user_id: str
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
    page: int = 1
    page_size: int = 50
    total_pages: int = 1


class InterviewDetail(BaseModel):
    id: str
    jobRole: str
    experienceLevel: str
    durationMinutes: int
    overallScore: int
    transcript: List[dict]
    report: dict
    completedAt: str


class DashboardStats(BaseModel):
    totalInterviews: int
    averageScore: float
    bestScore: int
    worstScore: int
    totalPracticeMinutes: int
    recentScores: List[int]
    scoreDistribution: dict
    skillAverages: dict


_PLAN_RANK = {"free": 0, "starter": 1, "pro": 2}
PLAN_RANK = MappingProxyType(_PLAN_RANK)

_PLAN_LIMITS = {
    "free": {
        "interviews_allowed": 2,
        "interviews_per_month": None,
        "max_duration_minutes": 15,
        "price_monthly": 0,
        "price_inr": 0,
        "has_analytics": False,
        "has_learning_plan": False,
        "lifetime": True,
    },
    "starter": {
        "interviews_allowed": 10,
        "interviews_per_month": 10,
        "max_duration_minutes": 15,
        "price_monthly": 299,
        "price_inr": 29900,
        "has_analytics": True,
        "has_learning_plan": True,
        "lifetime": False,
    },
    "pro": {
        "interviews_allowed": 20,
        "interviews_per_month": 20,
        "max_duration_minutes": 30,
        "price_monthly": 499,
        "price_inr": 49900,
        "has_analytics": True,
        "has_learning_plan": True,
        "free_priority": True,
        "lifetime": False,
    },
}
PLAN_LIMITS = MappingProxyType({k: MappingProxyType(v) for k, v in _PLAN_LIMITS.items()})


class SubscriptionResponse(BaseModel):
    plan: str
    interviewsAllowed: int
    interviewsUsed: int
    interviewsRemaining: int
    status: str
    currentPeriodStart: Optional[str] = None
    currentPeriodEnd: Optional[str] = None
    maxDurationMinutes: int = 15
    hasAnalytics: bool = False
    hasLearningPlan: bool = False
    isLifetime: bool = True


class SubscriptionUsageResponse(BaseModel):
    interviewsAllowed: int
    interviewsUsed: int
    interviewsRemaining: int
    canStartInterview: bool


class CreateOrderRequest(BaseModel):
    planId: str


class CreateOrderResponse(BaseModel):
    orderId: str
    amount: int
    currency: str
    keyId: str
    planId: str
    userEmail: str
    userName: str


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
