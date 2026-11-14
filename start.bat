@echo off
cd /d "%~dp0"
start "AURA voice" qwen-tts\bin\tts-server.exe --model model\qwen-talker-0.6b-customvoice-Q4_K_M.gguf --codec model\qwen-tokenizer-12hz-Q8_0.gguf --port 8081
start http://localhost:8080
bin\llama-server.exe -m model\Qwen3.5-4B-q4_k_m.gguf --path "%~dp0." --port 8080 -c 8192 --chat-template-kwargs "{\"enable_thinking\":false}"
pause