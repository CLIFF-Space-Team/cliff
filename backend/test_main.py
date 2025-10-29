"""
🌌 CLIFF - Test Backend for Quick Development
Simple FastAPI server for testing frontend connectivity
"""

import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Simple FastAPI app for testing
app = FastAPI(
    title="CLIFF - Test Backend",
    description="🌌 Simple test backend for CLIFF development",
    version="1.0.0-test"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check for testing"""
    return {
        "status": "healthy",
        "message": "CLIFF Test Backend is running!",
        "version": "1.0.0-test"
    }

# Root endpoint  
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "🌌 CLIFF Test Backend",
        "description": "Simple backend for frontend testing",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "threats": "/api/v1/threats",
            "nasa": "/api/v1/nasa"
        }
    }

# Mock NASA API data
@app.get("/api/v1/nasa/asteroids")
async def get_asteroids():
    """Mock asteroid data"""
    return {
        "data": [
            {
                "id": "2024001",
                "name": "2024 AA1",
                "diameter": 150.5,
                "distance": 0.0234,  # AU
                "velocity": 18.2,    # km/s
                "hazardous": False,
                "close_approach": "2024-12-15T14:30:00Z"
            },
            {
                "id": "2024002", 
                "name": "2024 BB2",
                "diameter": 89.3,
                "distance": 0.0156,
                "velocity": 22.8,
                "hazardous": True,
                "close_approach": "2024-12-20T08:45:00Z"
            }
        ]
    }

# Mock threat assessment
@app.get("/api/v1/threats/assessment")
async def get_threat_assessment():
    """Mock threat assessment data"""
    return {
        "overall_threat_level": "MODERATE",
        "active_threats": 3,
        "monitoring_objects": 1247,
        "last_updated": "2024-12-15T12:00:00Z",
        "threats": [
            {
                "id": "THR001",
                "type": "asteroid",
                "name": "2024 BB2",
                "threat_level": "HIGH",
                "impact_probability": 0.001,
                "estimated_impact": "2025-03-15T00:00:00Z",
                "description": "Potentially hazardous asteroid approaching Earth"
            },
            {
                "id": "THR002", 
                "type": "solar_flare",
                "name": "X2.1 Solar Flare",
                "threat_level": "MODERATE",
                "impact_probability": 0.8,
                "estimated_impact": "2024-12-16T06:00:00Z",
                "description": "Strong solar flare may disrupt communications"
            }
        ]
    }

# Mock space weather
@app.get("/api/v1/space-weather")
async def get_space_weather():
    """Mock space weather data"""
    return {
        "kp_index": 4,
        "solar_wind_speed": 425.6,  # km/s
        "proton_density": 8.2,      # n/cm³
        "magnetic_field": 6.8,      # nT
        "status": "ACTIVE",
        "alerts": [
            {
                "type": "geomagnetic_storm",
                "level": "G1", 
                "message": "Minor geomagnetic storm in progress"
            }
        ]
    }

# Mock voice API endpoint
@app.post("/api/v1/voice/synthesize")
async def synthesize_voice(request: dict):
    """Mock voice synthesis"""
    text = request.get("text", "Hello from CLIFF!")
    return {
        "success": True,
        "audio_url": "/static/audio/response.mp3",
        "text": text,
        "duration": len(text) * 0.1  # Mock duration calculation
    }

if __name__ == "__main__":
    print("Starting CLIFF Test Backend...")
    uvicorn.run(
        "test_main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )