from pydantic import BaseModel
from typing import List, Literal, Optional


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


class SignUpRequest(BaseModel):
    email: str
    password: str


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
