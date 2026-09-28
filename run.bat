@echo off
title Product Image Finder & CSV Enricher
echo ========================================================
echo Starting Product Image Finder App on http://localhost:8000
echo ========================================================
echo.
python -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload
pause
