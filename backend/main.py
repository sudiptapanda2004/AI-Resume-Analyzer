from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
import json
import os
from dotenv import load_dotenv

load_dotenv()

from database import get_db, init_db, ResumeAnalysis
from groq_service import analyze_resume, generate_chat_response

app = FastAPI(
    title="AI Resume Analyzer API",
    description="FastAPI backend for AI-powered resume analysis using Groq",
    version="1.0.0",
)

allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_db()


class AnalyzeRequest(BaseModel):
    resume_text: str
    job_description: str = ""
    file_name: str = "resume"


class HistoryItem(BaseModel):
    id: int
    file_name: str
    ats_score: float
    jd_match: float
    parsed_name: str
    created_at: str


@app.get("/")
def root():
    return {"status": "ok", "message": "AI Resume Analyzer API is running"}


@app.post("/analyze")
def analyze(request: AnalyzeRequest, db: Session = Depends(get_db)):
    if not request.resume_text or len(request.resume_text.strip()) < 50:
        raise HTTPException(status_code=400, detail="Resume text is too short or empty.")

    try:
        result = analyze_resume(request.resume_text, request.job_description)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="AI returned invalid JSON. Please try again.")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Groq API error: {str(e)}")

    # Persist to database
    record = ResumeAnalysis(
        file_name=request.file_name,
        ats_score=result.get("ats_score", 0),
        jd_match=result.get("jd_match", 0),
        parsed_name=result.get("parsed_info", {}).get("name", ""),
        parsed_email=result.get("parsed_info", {}).get("email", ""),
        parsed_phone=result.get("parsed_info", {}).get("phone", ""),
        result_json=json.dumps(result),
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return result


@app.get("/history", response_model=list[HistoryItem])
class ChatMessageItem(BaseModel):
    role: str  # Will accept "user" or "assistant"
    content: str

class ChatSessionRequest(BaseModel):
    messages: list[ChatMessageItem]

@app.post("/api/chat")
def chat_endpoint(request: ChatSessionRequest):
    if not request.messages:
        raise HTTPException(status_code=400, detail="Conversation history cannot be empty.")
    
    try:
        # Convert Pydantic schemas to standard dictionaries for the Groq client
        formatted_history = [
            {"role": "assistant" if m.role == "bot" else m.role, "content": m.content} 
            for m in request.messages
        ]
        
        ai_reply = generate_chat_response(formatted_history)
        return {"response": ai_reply}
        
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Groq Chat service error: {str(e)}")
def get_history(db: Session = Depends(get_db), limit: int = 20):
    records = (
        db.query(ResumeAnalysis)
        .order_by(ResumeAnalysis.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        HistoryItem(
            id=r.id,
            file_name=r.file_name,
            ats_score=r.ats_score,
            jd_match=r.jd_match,
            parsed_name=r.parsed_name or "Unknown",
            created_at=r.created_at.isoformat(),
        )
        for r in records
    ]


@app.get("/history/{analysis_id}")
def get_analysis(analysis_id: int, db: Session = Depends(get_db)):
    record = db.query(ResumeAnalysis).filter(ResumeAnalysis.id == analysis_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return json.loads(record.result_json)


@app.delete("/history/{analysis_id}")
def delete_analysis(analysis_id: int, db: Session = Depends(get_db)):
    record = db.query(ResumeAnalysis).filter(ResumeAnalysis.id == analysis_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Analysis not found")
    db.delete(record)
    db.commit()
    return {"message": "Deleted successfully"}
