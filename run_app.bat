@echo off
echo ====================================================
echo             STARTING AI RESUME ANALYSER
echo ====================================================

:: 1. Start the Python FastAPI Backend Server
echo Launching Python 3.13 Backend Server...
start "FastAPI Backend" cmd /k "cd backend && py -3.13 -m uvicorn main:app --reload"

:: 2. Start the Vite Frontend Website Server
echo Launching React Frontend Dev Server...
start "Vite Frontend" cmd /k "npm run dev"

:: 3. Give servers 3 seconds to spin up, then open your browser automatically
timeout /t 3 /nobreak > nul
echo Opening application in your web browser...
start http://localhost:5173

echo All systems initialized! Close the command windows to stop servers.
exit