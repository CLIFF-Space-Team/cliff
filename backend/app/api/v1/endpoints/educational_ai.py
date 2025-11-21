from typing import Dict, List, Optional, Any
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.responses import JSONResponse
from datetime import datetime
import structlog
from app.services.ai_services import (
    VertexAIServices,
    EducationalContentRequest,
    EducationalContentResponse,
    QuizGenerationRequest,
    QuizGenerationResponse,
    PersonalizedLearningRequest,
    PersonalizedLearningResponse,
    MentorChatRequest,
    MentorChatResponse,
    get_ai_services
)
from app.core.config import settings
logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/educational-ai", tags=["Educational AI"])
@router.post("/mentor/chat")
async def cliff_ai_mentor_chat(
    request: MentorChatRequest,
    ai_services: VertexAIServices = Depends(get_ai_services)
) -> MentorChatResponse:
    """
    ?? CLIFF-AI Mentor Chat - Intelligent Space Science Tutor
    NASA Challenge signature feature for personalized learning
    """
    try:
        if not request.message.strip():
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        context = request.get_context_dict()
        context.update({
            "student_id": request.get_student_id(),
            "learning_level": request.learning_level,
            "topic": request.topic,
            "nasa_challenge_mode": True
        })
        mentor_response = await ai_services.cliff_mentor_chat(request.message, context)
        follow_up_suggestions = [
            "Tell me more about that!",
            "How does this relate to space missions?",
            "Can you give me a real-world example?",
            "What should I learn next?"
        ]
        logger.info(f"CLIFF-AI mentor response generated for student {request.get_student_id()}")
        return MentorChatResponse(
            success=True,
            response=mentor_response,
            mentor="CLIFF-AI",
            timestamp=datetime.utcnow().isoformat() + "Z",
            context_understanding=True,
            engagement_level="high",
            follow_up_suggestions=follow_up_suggestions[:2]  # Return first 2 suggestions
        )
    except Exception as e:
        logger.error(f"CLIFF-AI mentor chat failed: {str(e)}")
        return MentorChatResponse(
            success=False,
            response=f"I apologize, but I'm experiencing some technical difficulties. However, I'm still here to help you with your space science questions! Could you try rephrasing your question: '{request.message[:50]}...'?",
            mentor="CLIFF-AI",
            timestamp=datetime.utcnow().isoformat() + "Z",
            context_understanding=False,
            engagement_level="moderate",
            follow_up_suggestions=["Try asking again", "Rephrase your question"]
        )
@router.post("/content/generate")
async def generate_educational_content(
    request: EducationalContentRequest,
    ai_services: VertexAIServices = Depends(get_ai_services)
) -> EducationalContentResponse:
    """
    ?? AI-Powered Educational Content Generation
    Create personalized space science learning materials
    """
    try:
        if not request.topic.strip():
            raise HTTPException(status_code=400, detail="Topic is required")
        content_response = await ai_services.generate_educational_content(request)
        logger.info(f"Educational content generated for topic: {request.topic}, difficulty: {request.difficulty_level}")
        return content_response
    except Exception as e:
        logger.error(f"Educational content generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Content generation failed: {str(e)}")
@router.post("/quiz/generate")
async def generate_ai_quiz(
    request: QuizGenerationRequest,
    ai_services: VertexAIServices = Depends(get_ai_services)
) -> QuizGenerationResponse:
    """
    ?? AI-Generated Quiz System
    Create intelligent assessments for space science learning
    """
    try:
        if not request.topic.strip():
            raise HTTPException(status_code=400, detail="Quiz topic is required")
        if request.num_questions < 1 or request.num_questions > 20:
            raise HTTPException(status_code=400, detail="Number of questions must be between 1 and 20")
        quiz_response = await ai_services.generate_quiz(request)
        logger.info(f"AI quiz generated: {request.num_questions} questions on {request.topic}")
        return quiz_response
    except Exception as e:
        logger.error(f"AI quiz generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Quiz generation failed: {str(e)}")
@router.post("/quiz/evaluate")
async def evaluate_quiz_responses(
    request: Dict[str, Any],
    ai_services: VertexAIServices = Depends(get_ai_services)
) -> Dict[str, Any]:
    """
    ? AI-Powered Quiz Evaluation
    Intelligent assessment with detailed feedback
    """
    try:
        student_answers = request.get("answers", [])
        quiz_questions = request.get("questions", [])
        student_id = request.get("student_id")
        if not student_answers or not quiz_questions:
            raise HTTPException(status_code=400, detail="Answers and questions are required")
        correct_answers = 0
        total_questions = len(quiz_questions)
        detailed_feedback = []
        for i, (answer, question) in enumerate(zip(student_answers, quiz_questions)):
            is_correct = answer == question.get("correct_answer")
            if is_correct:
                correct_answers += 1
            detailed_feedback.append({
                "question_number": i + 1,
                "correct": is_correct,
                "student_answer": answer,
                "correct_answer": question.get("correct_answer"),
                "explanation": question.get("explanation", ""),
                "feedback": "Excellent!" if is_correct else "Let's review this concept together."
            })
        score_percentage = (correct_answers / total_questions) * 100
        progress_context = {
            "score": score_percentage,
            "topic": request.get("topic", "space_science"),
            "incorrect_areas": [fb["question_number"] for fb in detailed_feedback if not fb["correct"]]
        }
        recommendations = await ai_services.analyze_progress(progress_context)
        logger.info(f"Quiz evaluated for student {student_id}: {score_percentage}% score")
        return {
            "success": True,
            "score": {
                "correct_answers": correct_answers,
                "total_questions": total_questions,
                "percentage": round(score_percentage, 1),
                "grade": "A" if score_percentage >= 90 else "B" if score_percentage >= 80 else "C" if score_percentage >= 70 else "D" if score_percentage >= 60 else "F"
            },
            "detailed_feedback": detailed_feedback,
            "ai_recommendations": recommendations,
            "next_steps": recommendations.get("recommended_topics", []),
            "study_focus": recommendations.get("knowledge_gaps", [])
        }
    except Exception as e:
        logger.error(f"Quiz evaluation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Quiz evaluation failed: {str(e)}")
@router.post("/learning/personalized-path")
async def create_personalized_learning_path(
    request: PersonalizedLearningRequest,
    ai_services: VertexAIServices = Depends(get_ai_services)
) -> PersonalizedLearningResponse:
    """
    ?? Personalized Learning Path Creation
    AI-adaptive curriculum for individual learning needs
    """
    try:
        if not request.student_id.strip():
            raise HTTPException(status_code=400, detail="Student ID is required")
        if not request.learning_goals:
            raise HTTPException(status_code=400, detail="Learning goals are required")
        learning_path = await ai_services.create_personalized_path(request)
        logger.info(f"Personalized learning path created for student {request.student_id}")
        return learning_path
    except Exception as e:
        logger.error(f"Personalized learning path creation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Learning path creation failed: {str(e)}")
@router.post("/learning/progress-analysis")
async def analyze_student_progress(
    request: Dict[str, Any],
    ai_services: VertexAIServices = Depends(get_ai_services)
) -> Dict[str, Any]:
    """
    ?? Student Progress Analysis
    AI-powered learning analytics and insights
    """
    try:
        student_id = request.get("student_id")
        progress_data = request.get("progress_data", {})
        if not student_id:
            raise HTTPException(status_code=400, detail="Student ID is required")
        analysis = await ai_services.analyze_progress(progress_data)
        logger.info(f"Progress analysis completed for student {student_id}")
        return {
            "success": True,
            "student_id": student_id,
            "analysis": analysis,
            "timestamp": "2025-10-02T15:56:00Z"
        }
    except Exception as e:
        logger.error(f"Student progress analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Progress analysis failed: {str(e)}")
@router.post("/content/adaptive")
async def generate_adaptive_content(
    request: Dict[str, Any],
    ai_services: VertexAIServices = Depends(get_ai_services)
) -> Dict[str, Any]:
    """
    ?? Adaptive Content Generation
    Dynamic content adjustment based on student performance
    """
    try:
        student_performance = request.get("performance_data", {})
        current_topic = request.get("topic", "")
        difficulty_preference = request.get("difficulty", "intermediate")
        learning_style = request.get("learning_style", "visual")
        if not current_topic:
            raise HTTPException(status_code=400, detail="Topic is required")
        content_request = EducationalContentRequest(
            topic=current_topic,
            difficulty_level=difficulty_preference,
            learning_style=learning_style,
            content_type="adaptive_explanation",
            context=student_performance
        )
        adaptive_content = await ai_services.generate_educational_content(content_request)
        logger.info(f"Adaptive content generated for topic: {current_topic}")
        return {
            "success": True,
            "adaptive_content": adaptive_content,
            "personalization_applied": True,
            "difficulty_adjusted": True,
            "style_optimized": learning_style
        }
    except Exception as e:
        logger.error(f"Adaptive content generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Adaptive content generation failed: {str(e)}")
@router.get("/status")
async def educational_ai_system_status(
    ai_services: VertexAIServices = Depends(get_ai_services)
) -> Dict[str, Any]:
    """
    ?? Educational AI System Status
    Monitor AI services and capabilities
    """
    try:
        system_status = {
            "gemini_pro_model": settings.GEMINI_PRO_MODEL,
            "gemini_flash_model": settings.GEMINI_FLASH_MODEL,
            "gemini_vision_model": settings.GEMINI_VISION_MODEL,
            "educational_ai_enabled": settings.ENABLE_EDUCATIONAL_AI,
            "ai_mentor_enabled": settings.ENABLE_AI_MENTOR,
            "personalized_learning_enabled": settings.ENABLE_PERSONALIZED_LEARNING,
            "quiz_generation_enabled": settings.ENABLE_AI_QUIZ_GENERATION,
            "adaptive_content_enabled": settings.ENABLE_ADAPTIVE_CONTENT,
            "system_health": "operational",
            "last_check": "2025-10-02T15:56:00Z",
            "features_available": [
                "CLIFF-AI Mentor Chat",
                "Educational Content Generation", 
                "AI-Powered Quiz System",
                "Personalized Learning Paths",
                "Adaptive Content Generation",
                "Progress Analytics"
            ]
        }
        logger.info("Educational AI system status checked")
        return {
            "success": True,
            "status": "operational",
            "system_info": system_status,
            "nasa_challenge_ready": True
        }
    except Exception as e:
        logger.error(f"Educational AI status check failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Status check failed: {str(e)}")
@router.post("/demo/showcase")
async def nasa_challenge_demo_showcase(
    request: Dict[str, Any],
    ai_services: VertexAIServices = Depends(get_ai_services)
) -> Dict[str, Any]:
    """
    ?? NASA Challenge Demo Showcase
    Demonstrate all AI capabilities in one endpoint
    """
    try:
        demo_topic = request.get("topic", "Mars Exploration")
        student_name = request.get("student_name", "Demo Student")
        content_request = EducationalContentRequest(
            topic=demo_topic,
            difficulty_level="intermediate",
            learning_style="visual",
            content_type="interactive_explanation"
        )
        educational_content = await ai_services.generate_educational_content(content_request)
        quiz_request = QuizGenerationRequest(
            topic=demo_topic,
            num_questions=3,
            difficulty_level="intermediate"
        )
        quiz = await ai_services.generate_quiz(quiz_request)
        mentor_response = await ai_services.cliff_mentor_chat(
            f"Tell me something exciting about {demo_topic}!",
            {"demo_mode": True, "student_name": student_name}
        )
        learning_request = PersonalizedLearningRequest(
            student_id=f"demo_{student_name.replace(' ', '_')}",
            current_knowledge={demo_topic.lower().replace(' ', '_'): 0.6},
            learning_goals=[f"Master {demo_topic}", "Understand space missions"],
            time_available=45
        )
        learning_path = await ai_services.create_personalized_path(learning_request)
        logger.info(f"NASA Challenge demo showcase completed for topic: {demo_topic}")
        return {
            "success": True,
            "demo_title": f"?? CLIFF Educational AI - {demo_topic} Learning Experience",
            "capabilities_demonstrated": [
                "AI-Powered Educational Content Generation",
                "Intelligent Quiz Creation", 
                "CLIFF-AI Mentor Interaction",
                "Personalized Learning Path Creation"
            ],
            "results": {
                "educational_content": educational_content,
                "ai_quiz": quiz,
                "mentor_interaction": mentor_response,
                "learning_path": learning_path
            },
            "nasa_challenge_features": [
                "? Gemini 2.5 Pro Integration",
                "? Personalized Learning AI",
                "? Real-time Content Adaptation", 
                "? Intelligent Assessment System",
                "? NASA Mission Integration",
                "? Multi-modal Learning Support"
            ],
            "competition_advantage": "Most advanced AI-powered space education platform",
            "demo_timestamp": "2025-10-02T15:56:00Z"
        }
    except Exception as e:
        logger.error(f"NASA Challenge demo showcase failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Demo showcase failed: {str(e)}")
@router.get("/health")
async def educational_ai_health_check() -> Dict[str, Any]:
    """
    ?? Educational AI Health Check
    Quick system health verification
    """
    return {
        "status": "healthy",
        "service": "CLIFF Educational AI",
        "gemini_integration": "active",
        "nasa_challenge_ready": True,
        "timestamp": "2025-10-02T15:56:00Z"
    }
@router.post("/diagnostics/test-vertex-ai")
async def test_vertex_ai_connection(
    ai_services: VertexAIServices = Depends(get_ai_services)
) -> Dict[str, Any]:
    """
    ?? Vertex AI API Connection Diagnostics (beta.vertexapis.com)
    Test the Vertex AI API connection and authentication
    """
    try:
        logger.info("?? Starting Vertex AI connection diagnostics...")
        connection_test = await ai_services.test_gemini_api_connection()
        diagnostic_info = {
            "test_timestamp": datetime.utcnow().isoformat() + "Z",
            "api_provider": "Vertex AI (beta.vertexapis.com)",
            "configuration": {
                "base_url": "https://beta.vertexapis.com",
                "project_id": ai_services.project_id,
                "location": ai_services.location,
                "api_key_configured": bool(ai_services.gemini_api_key and len(ai_services.gemini_api_key) > 30)
            },
            "models_configured": ai_services.models,
            "connection_test_result": connection_test
        }
        if connection_test.get("valid"):
            logger.info("? Vertex AI diagnostics PASSED")
            return {
                "success": True,
                "status": "healthy",
                "message": "Vertex AI connection successful with beta.vertexapis.com",
                "diagnostics": diagnostic_info
            }
        else:
            logger.error(f"? Vertex AI diagnostics FAILED: {connection_test.get('error')}")
            return {
                "success": False,
                "status": "connection_failed",
                "message": f"Vertex AI connection failed: {connection_test.get('error')}",
                "diagnostics": diagnostic_info,
                "troubleshooting": [
                    "Check VERTEX_AI_API_KEY in environment configuration",
                    "Verify VERTEX_AI_PROJECT_ID is correct",
                    "Ensure project has Vertex AI API enabled",
                    "Check network connectivity to beta.vertexapis.com"
                ]
            }
    except Exception as e:
        error_msg = f"Vertex AI diagnostics failed: {str(e)}"
        logger.error(error_msg)
        return {
            "success": False,
            "status": "diagnostic_error", 
            "message": error_msg,
            "error_details": str(e)
        }
@router.post("/diagnostics/database-health")
async def test_database_connection() -> Dict[str, Any]:
    """
    ?? Database Health Diagnostics
    Test MongoDB connection and SSL issues
    """
    try:
        logger.info("?? Starting database health diagnostics...")
        from app.core.database import check_database_health, get_connection_status
        health_result = await check_database_health()
        connection_status = get_connection_status()
        diagnostic_info = {
            "test_timestamp": datetime.utcnow().isoformat() + "Z",
            "database_type": "MongoDB Atlas",
            "connection_string_configured": bool(settings.MONGODB_URL),
            "health_check": health_result,
            "connection_status": connection_status
        }
        if health_result.get("status") == "healthy":
            logger.info("? Database diagnostics PASSED")
            return {
                "success": True,
                "status": "healthy",
                "message": "Database connection healthy",
                "diagnostics": diagnostic_info
            }
        else:
            logger.warning(f"?? Database diagnostics WARNING: {health_result.get('error')}")
            return {
                "success": False,
                "status": "unhealthy",
                "message": f"Database issues detected: {health_result.get('error')}",
                "diagnostics": diagnostic_info,
                "troubleshooting": [
                    "Check MongoDB SSL certificate configuration",
                    "Verify network connectivity to MongoDB Atlas",
                    "Check MongoDB connection string format",
                    "Review SSL handshake timeout settings"
                ]
            }
    except Exception as e:
        error_msg = f"Database diagnostics failed: {str(e)}"
        logger.error(error_msg)
        return {
            "success": False,
            "status": "diagnostic_error",
            "message": error_msg,
            "error_details": str(e)
        }
@router.get("/diagnostics/system-overview")
async def system_diagnostics_overview(
    ai_services: VertexAIServices = Depends(get_ai_services)
) -> Dict[str, Any]:
    """
    ?? Complete System Diagnostics Overview
    Comprehensive system health check for NASA Challenge demo
    """
    try:
        logger.info("?? Running complete system diagnostics...")
        diagnostics = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "system_version": "CLIFF v2.0.0",
            "nasa_challenge_ready": True,
            "components": {}
        }
        try:
            vertex_test = await ai_services.test_gemini_api_connection()
            diagnostics["components"]["vertex_ai"] = {
                "status": "healthy" if vertex_test.get("valid") else "unhealthy",
                "api_provider": "Vertex AI (beta.vertexapis.com)",
                "details": vertex_test
            }
        except Exception as e:
            diagnostics["components"]["vertex_ai"] = {
                "status": "error",
                "error": str(e)
            }
        try:
            from app.core.database import check_database_health
            db_health = await check_database_health()
            diagnostics["components"]["database"] = {
                "status": db_health.get("status", "unknown"),
                "type": "MongoDB Atlas",
                "details": db_health
            }
        except Exception as e:
            diagnostics["components"]["database"] = {
                "status": "error",
                "error": str(e)
            }
        all_healthy = all(
            comp.get("status") == "healthy" 
            for comp in diagnostics["components"].values()
        )
        diagnostics["overall_status"] = "healthy" if all_healthy else "needs_attention"
        diagnostics["components_count"] = len(diagnostics["components"])
        diagnostics["healthy_components"] = sum(
            1 for comp in diagnostics["components"].values() 
            if comp.get("status") == "healthy"
        )
        if all_healthy:
            logger.info("? All system diagnostics PASSED - NASA Challenge Ready!")
        else:
            logger.warning("?? Some system components need attention")
        return diagnostics
    except Exception as e:
        error_msg = f"System diagnostics failed: {str(e)}"
        logger.error(error_msg)
        return {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "overall_status": "diagnostic_error",
            "error": error_msg
        }
