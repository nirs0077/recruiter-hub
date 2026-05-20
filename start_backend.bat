@echo off
title RecruiterHub - Backend
cd /d "D:\ניר שונות\הורדות\recruiter-hub\backend"
echo Starting RecruiterHub Backend...
.\venv311\Scripts\python.exe -m uvicorn main:app --reload --port 8000
pause
