@echo off
chcp 65001 >nul
title Festa sem Nome - servidor
cd /d "%~dp0"

echo.
echo  ============================================
echo    FESTA SEM NOME  -  servidor
echo  ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo  [ERRO] Node.js nao encontrado. Instale em https://nodejs.org
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo  Dependencias ausentes. Rodando install.bat...
  echo.
  call install.bat
)

if not exist "node_modules\three\build\three.module.js" (
  echo  [AVISO] three.js ausente em node_modules - rodando npm install...
  call npm install --no-audit --no-fund
)

echo  abrindo http://127.0.0.1:3018
start "" cmd /c "timeout /t 2 >nul & start "" http://127.0.0.1:3018"

echo  (ctrl+c para parar o servidor)
echo.
node server.js

echo.
echo  Servidor encerrado.
pause
