# AI Resume Analyzer — FastAPI Backend

## Stack
- **FastAPI** — REST API
- **Groq API** (`llama-3.3-70b-versatile`) — AI analysis
- **SQLite** (default) / **MySQL** (production) — result storage
- **SQLAlchemy** — ORM

## Quick Start

```bash
cd backend

# 1. Create virtual environment
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Set up environment variables
cp .env.example .env
# Edit .env and add your GROQ_API_KEY

# 4. Run the server
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`  
Interactive docs at `http://localhost:8000/docs`

## Get a Free Groq API Key
1. Go to https://console.groq.com
2. Sign up / log in
3. Create an API key
4. Paste it in your `.env` file as `GROQ_API_KEY`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/analyze` | Analyze a resume (main endpoint) |
| GET | `/history` | List past analyses |
| GET | `/history/{id}` | Get a specific analysis result |
| DELETE | `/history/{id}` | Delete an analysis |

## Switching to MySQL
Install the MySQL driver:
```bash
pip install pymysql
```
Update `.env`:
```
DATABASE_URL=mysql+pymysql://user:password@localhost/resume_analyzer
```

## Deploying to Production
- Deploy with `uvicorn main:app --host 0.0.0.0 --port 8000`
- Use **Railway**, **Render**, or **Fly.io** for free hosting
- Set `ALLOWED_ORIGINS` to your production frontend URL
