@echo off
cd /d "%~dp0"
start "" /b bin\llama-server.exe -m model\Qwen3.5-4B-q4_k_m.gguf --path "%~dp0." --port 8080 -c 8192 --chat-template-kwargs "{\"enable_thinking\":false}"
if errorlevel 1 (
  echo Failed to start the local AI server.
  pause
  exit /b 1
)

set /a attempts=0
:wait_for_server
curl.exe --silent --fail http://127.0.0.1:8080/health >nul
if not errorlevel 1 goto server_ready
set /a attempts+=1
if %attempts% geq 90 goto server_timeout
timeout /t 2 /nobreak >nul
goto wait_for_server

:server_timeout
echo The local AI server did not become ready within 3 minutes.
pause
exit /b 1

:server_ready
start "" http://localhost:8080
pause