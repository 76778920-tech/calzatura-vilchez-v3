@echo off
echo Iniciando Calzatura Vilchez AI Service...
"C:\Users\RYZEN\AppData\Local\Programs\Python\Python314\python.exe" -m hypercorn main:app --reload --bind [::]:8000
pause
