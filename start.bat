@echo off
cd /d "%~dp0"
start http://localhost:8080
bin\llama-server.exe -m model\qwen2.5-3b-instruct-q4_k_m.gguf --path . --port 8080
pause