from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
import structlog

logger = structlog.get_logger(__name__)

class EducationalContentRequest(BaseModel):
    topic: str = Field(..., description="The topic to create content for")
    difficulty_level: str = Field(default="intermediate")
    learning_style: str = Field(default="visual")
    content_type: str = Field(default="explanation")
    context: Optional[Dict[str, Any]] = Field(default=None)

class EducationalContentResponse(BaseModel):
    success: bool
    content: str
    content_type: str
    difficulty_level: str
    learning_objectives: List[str]
    key_concepts: List[str]
    suggested_activities: List[str]
    timestamp: str

class QuizGenerationRequest(BaseModel):
    topic: str = Field(...)
    num_questions: int = Field(default=5)
    difficulty_level: str = Field(default="intermediate")
    question_types: List[str] = Field(default=["multiple_choice", "true_false"])

class QuizGenerationResponse(BaseModel):
    success: bool
    questions: List[Dict[str, Any]]
    total_questions: int
    difficulty_level: str
    estimated_time_minutes: int
    timestamp: str

class PersonalizedLearningRequest(BaseModel):
    student_id: str
    current_knowledge: Dict[str, float] = Field(default={})
    learning_goals: List[str]
    time_available: int = Field(default=30)
    learning_preferences: Optional[Dict[str, Any]] = Field(default=None)

class PersonalizedLearningResponse(BaseModel):
    success: bool
    learning_path: List[Dict[str, Any]]
    estimated_completion_time: int
    difficulty_progression: str
    recommended_resources: List[str]
    timestamp: str

class MentorChatRequest(BaseModel):
    message: str
    student_id: Optional[str] = Field(default="anonymous")
    topic: Optional[str] = Field(default="general")
    learning_level: str = Field(default="intermediate")
    context: Optional[Dict[str, Any]] = Field(default=None)
    
    def get_student_id(self) -> str:
        return self.student_id or "anonymous"
    
    def get_context_dict(self) -> Dict[str, Any]:
        return self.context or {}

class MentorChatResponse(BaseModel):
    success: bool
    response: str
    mentor: str = "CLIFF-AI"
    timestamp: str
    context_understanding: bool
    engagement_level: str
    follow_up_suggestions: List[str] = []

class VertexAIServices:
    def __init__(self):
        logger.warning("VertexAIServices is deprecated, use openai_compatible_service instead")
        pass
    
    async def generate_educational_content(self, request: EducationalContentRequest) -> EducationalContentResponse:
        return EducationalContentResponse(
            success=False,
            content="Service deprecated",
            content_type=request.content_type,
            difficulty_level=request.difficulty_level,
            learning_objectives=[],
            key_concepts=[],
            suggested_activities=[],
            timestamp=datetime.now().isoformat()
        )
    
    async def generate_quiz(self, request: QuizGenerationRequest) -> QuizGenerationResponse:
        return QuizGenerationResponse(
            success=False,
            questions=[],
            total_questions=0,
            difficulty_level=request.difficulty_level,
            estimated_time_minutes=0,
            timestamp=datetime.now().isoformat()
        )
    
    async def personalized_learning_path(self, request: PersonalizedLearningRequest) -> PersonalizedLearningResponse:
        return PersonalizedLearningResponse(
            success=False,
            learning_path=[],
            estimated_completion_time=0,
            difficulty_progression="",
            recommended_resources=[],
            timestamp=datetime.now().isoformat()
        )
    
    async def mentor_chat(self, request: MentorChatRequest) -> MentorChatResponse:
        return MentorChatResponse(
            success=False,
            response="Service deprecated",
            timestamp=datetime.now().isoformat(),
            context_understanding=False,
            engagement_level="none",
            follow_up_suggestions=[]
        )
    
    async def close_client(self):
        pass

_ai_services: Optional[VertexAIServices] = None

def get_ai_services() -> VertexAIServices:
    global _ai_services
    if _ai_services is None:
        _ai_services = VertexAIServices()
    return _ai_services

async def close_ai_clients():
    global _ai_services
    if _ai_services:
        await _ai_services.close_client()
        _ai_services = None
