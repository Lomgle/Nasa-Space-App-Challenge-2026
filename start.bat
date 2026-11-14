@echo off
cd /d "%~dp0"
start http://localhost:8080
bin\llama-server.exe -m model\Qwen3.5-4B-q4_k_m.gguf --path "%~dp0." --port 8080 -c 8192 --chat-template-kwargs "{\"enable_thinking\":false}"
pause