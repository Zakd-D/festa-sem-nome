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

rem escuta em todas as interfaces (Wi-Fi + Tailscale)
set HOST=0.0.0.0
set PORT=3018

echo  ---------------------------------------------------------------
echo   NESTA PC ......... http://127.0.0.1:3018
echo.
echo   NA SUA REDE ...... descubra o IP com:  ipconfig
echo                      (Wi-Fi, algo como 192.168.1.12) ^-^> http://SEU-IP:3018
echo   NO TAILSCALE ..... descubra com:       tailscale ip -4
echo                      (algo como 100.68.202.114)      ^-^> http://SEU-IP:3018
echo.
echo   Para liberar a entrada de outros aparelhos, rode UMA vez,
echo   como Administrador, o arquivo: compartilhar.bat
echo  ---------------------------------------------------------------
echo.
echo  (ctrl+c para parar o servidor)
echo.

start "" cmd /c "timeout /t 2 >nul & start "" http://127.0.0.1:3018"

node server.js

echo.
echo  Servidor encerrado.
pause
