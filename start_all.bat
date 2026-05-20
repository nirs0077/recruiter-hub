@echo off
title RecruiterHub - Launcher
echo.
echo  ========================================
echo    RecruiterHub - Starting System...
echo  ========================================
echo.

REM Start Backend
start "RecruiterHub Backend" /d "D:\ניר שונות\הורדות\recruiter-hub\backend" cmd /k ".\venv311\Scripts\python.exe -m uvicorn main:app --reload --port 8000"

REM Wait for backend to start
echo Waiting for backend to start...
timeout /t 5 /nobreak > nul

REM Start Frontend
start "RecruiterHub Frontend" /d "D:\ניר שונות\הורדות\recruiter-hub\frontend" cmd /k "npm run dev"

REM Wait for frontend to start
echo Waiting for frontend to start...
timeout /t 5 /nobreak > nul

REM Open browser
echo Opening browser...
start "" "http://localhost:5173"

echo.
echo  System started! Close this window if you want.
timeout /t 3 /nobreak > nul
exit
