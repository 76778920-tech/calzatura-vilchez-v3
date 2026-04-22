@echo off
echo Iniciando Calzatura Vilchez AI Service...
"C:\Users\RYZEN\AppData\Local\Programs\Python\Python314\python.exe" -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
pause
