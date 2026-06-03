@echo off
echo =============================================
echo   VedaAI - AI Assessment Creator Setup
echo =============================================
echo.

echo [1/3] Installing backend dependencies...
cd backend
call npm install
if errorlevel 1 (
  echo ERROR: Backend install failed
  exit /b 1
)
echo Backend dependencies installed.
echo.

echo [2/3] Installing frontend dependencies...
cd ..\frontend
call npm install
if errorlevel 1 (
  echo ERROR: Frontend install failed
  exit /b 1
)
echo Frontend dependencies installed.
echo.

echo [3/3] Setup complete!
echo.
echo ============================================
echo  NEXT STEPS:
echo  1. Edit backend\.env and add your OPENAI_API_KEY
echo  2. Start MongoDB: mongod
echo  3. Start Redis: redis-server
echo  4. In one terminal: cd backend && npm run dev
echo  5. In another terminal: cd backend && npm run worker
echo  6. In another terminal: cd frontend && npm run dev
echo  7. Open http://localhost:3000
echo ============================================
cd ..
pause
