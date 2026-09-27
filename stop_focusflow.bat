@echo off
echo ==============================================================================
echo                      FocusFlow AI - Docker Stop Script
echo ==============================================================================
echo.
echo Stopping FocusFlow AI containers safely...
docker compose down

echo.
echo ==============================================================================
echo FocusFlow AI containers stopped.
echo Note: Persistent SQLite database, Ollama models, and caches remain preserved.
echo ==============================================================================
echo.
pause
