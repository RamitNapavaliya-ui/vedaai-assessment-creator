@echo off
setlocal
set DOCKER="C:\Program Files\Docker\Docker\resources\bin\docker.exe"
set NODE="C:\Program Files\nodejs\node.exe"
set NPM="C:\Program Files\nodejs\npm.cmd"

echo =============================================
echo   VedaAI - Starting All Services
echo =============================================
echo.

:: Check Node
%NODE% --version >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js not found. Install from https://nodejs.org
  pause & exit /b 1
)
echo [OK] Node.js found

:: Check npm folder
if not exist "C:\Users\DELL\AppData\Roaming\npm" mkdir "C:\Users\DELL\AppData\Roaming\npm"

:: Check Docker daemon
echo [..] Checking Docker...
%DOCKER% ps >nul 2>&1
if errorlevel 1 (
  echo [WAIT] Docker not ready yet. Please make sure Docker Desktop is running.
  echo        Look for the Docker whale icon in your taskbar.
  echo        Once it shows "Docker Desktop is running", press any key to continue.
  pause
)

:: Start MongoDB
echo [..] Starting MongoDB container...
%DOCKER% start vedaai-mongo >nul 2>&1
if errorlevel 1 (
  echo [..] Creating MongoDB container...
  %DOCKER% run -d -p 27017:27017 --name vedaai-mongo mongo:7
)
echo [OK] MongoDB started on port 27017

:: Start Redis
echo [..] Starting Redis container...
%DOCKER% start vedaai-redis >nul 2>&1
if errorlevel 1 (
  echo [..] Creating Redis container...
  %DOCKER% run -d -p 6379:6379 --name vedaai-redis redis:7-alpine
)
echo [OK] Redis started on port 6379

:: Check node_modules
if not exist "backend\node_modules" (
  echo [..] Installing backend dependencies...
  cd backend & %NPM% install & cd ..
)
if not exist "frontend\node_modules" (
  echo [..] Installing frontend dependencies...
  cd frontend & %NPM% install & cd ..
)

:: Start Backend in new window
echo [..] Starting backend server...
start "VedaAI Backend" cmd /k "cd /d "%~dp0backend" && "C:\Program Files\nodejs\node_modules\.bin\ts-node-dev.cmd" --respawn --transpile-only src/index.ts"

timeout /t 3 /nobreak >nul

:: Start Frontend in new window  
echo [..] Starting frontend...
start "VedaAI Frontend" cmd /k "cd /d "%~dp0frontend" && "C:\Program Files\nodejs\npm.cmd" run dev"

echo.
echo =============================================
echo  All services started!
echo  Frontend: http://localhost:3000
echo  Backend:  http://localhost:4000
echo  Health:   http://localhost:4000/health
echo =============================================
echo.
echo Waiting for servers to boot (15s)...
timeout /t 15 /nobreak >nul

:: Open browser
start http://localhost:3000
echo Browser opened. Press any key to close this window.
pause
