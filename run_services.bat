@echo off
title MediQueue Microservices Launcher
echo ===================================================
echo   Menjalankan MediQueue Microservices...
echo ===================================================

:: 1. Jalankan Queue Service di window cmd baru
echo [Queue Service] Menjalankan di Port 5002...
start "Queue Service (Port 5002)" cmd /k "python services/queue_service/app.py"

:: 2. Jalankan Auth Service di window ini
echo [Auth Service] Menjalankan di Port 5001...
python services/auth_service/app.py
