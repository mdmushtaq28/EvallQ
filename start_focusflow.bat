@echo off
setlocal enabledelayedexpansion

echo ==============================================================================
echo                      FocusFlow AI - Local Docker Launcher
echo ==============================================================================
echo.

REM 1. Verify Docker CLI and Daemon Availability
where docker >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker executable not found in PATH.
    echo Please install Docker Desktop for Windows: https://www.docker.com/products/docker-desktop/
    pause
    exit /b 1
)

docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker daemon is not running.
    echo Please start Docker Desktop and wait for it to become ready, then re-run this script.
    pause
    exit /b 1
)

echo [1/3] Docker daemon verified and active.
echo [2/3] Starting FocusFlow AI container stack...
echo       - Services: Nginx Frontend, FastAPI Backend, Ollama Engine
echo.

docker compose up -d --build

if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to start Docker Compose stack.
    pause
    exit /b 1
)

echo.
echo [3/3] FocusFlow AI containers launched successfully!
echo ==============================================================================
echo FocusFlow AI is now running at:
echo   --^> Web Application:    http://localhost
echo   --^> Backend API Health: http://localhost/api/health
echo   --^> Model Status:       http://localhost/api/model/status
echo ==============================================================================
echo (To shut down the application cleanly, run stop_focusflow.bat)
echo.
pause
