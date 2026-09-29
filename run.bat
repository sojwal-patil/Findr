@echo off
title Findr - Product Image Finder & CSV Enricher
echo ========================================================
echo Starting Findr App on http://localhost:8000
echo ========================================================
echo.
python -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload
pause
