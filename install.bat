@echo off
chcp 65001 >nul
title Festa sem Nome - instalar
cd /d "%~dp0"

echo.
echo  ============================================
echo    FESTA SEM NOME  -  instalacao
echo  ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo  [ERRO] Node.js nao encontrado.
  echo.
  echo  Instale em https://nodejs.org  ^(versao LTS^) e rode este arquivo de novo.
  echo.
  pause
  exit /b 1
)

for /f "delims=" %%v in ('node -v') do set NODEVER=%%v
echo  Node.js %NODEVER% encontrado.
echo.

echo  [1/2] instalando dependencias ^(express, three.js^)...
call npm install --no-audit --no-fund
if errorlevel 1 (
  echo.
  echo  [ERRO] npm install falhou. Verifique sua conexao.
  echo.
  pause
  exit /b 1
)

echo.
echo  [2/2] conferindo arquivos...
if not exist "node_modules\three\build\three.module.js" (
  echo  [AVISO] three.js nao foi encontrado em node_modules.
) else (
  echo  three.js ok.
)
if not exist "server.js" (
  echo  [ERRO] server.js nao encontrado nesta pasta.
  pause
  exit /b 1
)
if not exist "public\index.html" (
  echo  [ERRO] public\index.html nao encontrado.
  pause
  exit /b 1
)

echo.
echo  ============================================
echo    PRONTO. Rode o run.bat para abrir o site.
echo  ============================================
echo.
pause
