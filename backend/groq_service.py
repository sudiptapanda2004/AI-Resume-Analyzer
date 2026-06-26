import os
import json
import re

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - optional dependency in test environments
    def load_dotenv() -> bool:
        return False

try:
    from groq import Groq
except ImportError:  # pragma: no cover - optional dependency in test environments
    Groq = None

load_dotenv()

api_key = os.getenv("GROQ_API_KEY")
client = Groq(api_key=api_key) if Groq and api_key else None

SYSTEM_PROMPT = """You are an expert ATS (Applicant Tracking System) and resume analyzer.
Analyze the provided resume text and job description, then return a structured JSON response.

Be accurate and extract ONLY information explicitly present in the resume.
Do not hallucinate or invent details."""

ANALYSIS_PROMPT_TEMPLATE = """Analyze the following resume and job description. Return ONLY a valid JSON object with this exact structure:

{{
  "parsed_info": {{
    "name": "Full name from resume",
    "email": "email@example.com or 'Not detected'",
    "phone": "phone number or 'Not detected'",
    "sections": "comma-separated list of sections found e.g. skills, experience, education",
    "skills": ["skill1", "skill2"],
    "education": [
      {{
        "degree": "Degree name",
        "institution": "University/School name",
        "dates": "Date range",
        "grade": "GPA/percentage if mentioned, else omit"
      }}
    ],
    "experience": [
      {{
        "title": "Job title",
        "company": "Company name",
        "dates": "Date range",
        "description": "Brief description of role"
      }}
    ]
  }},
  "ats_score": <integer 0-100>,
  "jd_match": <integer 0-100, or 0 if no JD provided>,
  "ats_breakdown": {{
    "contact": <integer, max 10 points>,
    "sections": <integer, max 30 points>,
    "skills": <integer, max 40 points>,
    "keywords": <integer, max 20 points>
  }},
  "strength_areas": ["area1", "area2"],
  "matching_skills": ["skill that appears in both resume and JD"],
  "missing_skills": ["skill required by JD but not in resume"],
  "missing_keywords": ["important keyword from JD missing in resume"],
  "recommendations": [
    "Specific actionable recommendation 1",
    "Specific actionable recommendation 2"
  ],
  "learning_suggestions": [
    "Learning suggestion 1",
    "Learning suggestion 2"
  ],
  "interview_questions": {
  "technical": [
    {{
      "question": "Technical question 1",
      "answer": "Detailed interview answer"
    }},
    {{
      "question": "Technical question 2",
      "answer": "Detailed interview answer"
    }},
    {{
      "question": "Technical question 3",
      "answer": "Detailed interview answer"
    }},
    {{
      "question": "Technical question 4",
      "answer": "Detailed interview answer"
    }},
    {{
      "question": "Technical question 5",
      "answer": "Detailed interview answer"
    }}
  ],
  "behavioral": [
    {{
      "question": "Behavioral question 1",
      "answer": "STAR format answer"
    }},
    {{
      "question": "Behavioral question 2",
      "answer": "STAR format answer"
    }},
    {{
      "question": "Behavioral question 3",
      "answer": "STAR format answer"
    }}
  ],
  "hr": [
    {{
      "question": "HR question 1",
      "answer": "Professional answer"
    }},
    {{
      "question": "HR question 2",
      "answer": "Professional answer"
    }},
    {{
      "question": "HR question 3",
      "answer": "Professional answer"
    }}
  ],
  "scenario_based": [
    {{
      "question": "Scenario question 1",
      "answer": "Step-by-step approach"
    }},
    {{
      "question": "Scenario question 2",
      "answer": "Step-by-step approach"
    }},
    {{
      "question": "Scenario question 3",
      "answer": "Step-by-step approach"
    }}
  ]
}}
}}

Interview Question Rules:
- Generate BOTH question and answer.
- Answers must be tailored to the candidate's resume.
- Technical answers should explain concepts clearly.
- Behavioral answers should follow STAR format.
- HR answers should be professional and concise.
- Scenario answers should explain step-by-step thinking.
- Each answer should be 80-150 words.

ATS Score rules:
- Contact (0-10): 10 if name+email+phone all present, 7 if two, 3 if one
- Sections (0-30): Award based on number and quality of sections
- Skills (0-40): Based on breadth and relevance of skills listed
- Keywords (0-20): Match of resume keywords with JD keywords

JD Match: If job description is empty, return 0.

RESUME TEXT:
{resume_text}

JOB DESCRIPTION:
{job_description}

Return ONLY the JSON object, no markdown, no explanation."""


def _coerce_int(value, default: int = 0) -> int:
    if isinstance(value, bool):
        return default
    if isinstance(value, (int, float)):
        return int(value)
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            return default
        try:
            return int(float(stripped))
        except ValueError:
            return default
    return default


def normalize_analysis_result(result: dict) -> dict:
    normalized = dict(result or {})
    breakdown = normalized.get("ats_breakdown") if isinstance(normalized.get("ats_breakdown"), dict) else {}

    contact = _coerce_int(breakdown.get("contact"))
    sections = _coerce_int(breakdown.get("sections"))
    skills = _coerce_int(breakdown.get("skills"))
    keywords = _coerce_int(breakdown.get("keywords"))

    computed_score = max(0, min(100, contact + sections + skills + keywords))
    has_breakdown_values = any(value > 0 for value in (contact, sections, skills, keywords))

    if has_breakdown_values:
        normalized["ats_score"] = computed_score
    else:
        normalized["ats_score"] = _coerce_int(normalized.get("ats_score"), default=0)

    normalized["jd_match"] = _coerce_int(normalized.get("jd_match"), default=0)
    normalized["ats_breakdown"] = {
        "contact": contact,
        "sections": sections,
        "skills": skills,
        "keywords": keywords,
    }

    return normalized


def analyze_resume(resume_text: str, job_description: str) -> dict:
    if client is None:
        raise RuntimeError("Groq client is not available. Install the groq package and set GROQ_API_KEY.")

    prompt = ANALYSIS_PROMPT_TEMPLATE.replace(
        "{resume_text}", resume_text[:8000]
    ).replace(
        "{job_description}", job_description[:3000] if job_description else "No job description provided."
    )

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
        max_tokens=4096,
    )

    raw = response.choices[0].message.content.strip()

    # Strip markdown code fences if present
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    return normalize_analysis_result(json.loads(raw))

def generate_chat_response(messages_history: list) -> str:
    """
    Communicates with Groq to generate a conversational response 
    based on the provided message history stack.
    """
    if client is None:
        raise RuntimeError("Groq client is not available. Check your GROQ_API_KEY environment variable.")

    system_instruction = {
        "role": "system",
        "content": (
            "You are an expert AI Resume Assistant and career coach. Your goal is to help "
            "the user optimize their resume, map skills, address professional gaps, and prepare "
            "for technical or behavioral job interviews. Be concise, actionable, and encouraging."
        )
    }

    # Inject the system prompt at the very beginning of the message timeline
    full_messages = [system_instruction] + messages_history

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=full_messages,
        temperature=0.5,
        max_tokens=1024,
    )

    return response.choices[0].message.content.strip()