@echo off
echo Starting CLIFF Backend Server...
echo.
cd C:\Users\ziya0\cliff\backend
REM Use python -m uvicorn to run from main module (avoids multiprocessing logging issues)
python main.py

echo.
echo CLIFF Backend Server stopped.
pause