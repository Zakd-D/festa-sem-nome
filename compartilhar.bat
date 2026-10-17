@echo off
chcp 65001 >nul
title Festa sem Nome - liberar acesso na rede
cd /d "%~dp0"

rem ---- sobe com privilegio de administrador (aparece o cartel do UAC) ----
net session >nul 2>&1
if errorlevel 1 (
  echo  Pidindo permissao de administrador...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

echo.
echo  ============================================
echo    LIBERANDO A PORTA 3018 NO FIREWALL
echo  ============================================
echo.

netsh advfirewall firewall delete rule name="FestaSemNome 3018" >nul 2>&1
netsh advfirewall firewall add rule name="FestaSemNome 3018" dir=in action=allow protocol=TCP localport=3018
netsh advfirewall firewall add rule name="FestaSemNome 3018 UDP" dir=in action=allow protocol=UDP localport=3018 >nul 2>&1

echo.
echo  ---- regra criada ----
netsh advfirewall firewall show rule name="FestaSemNome 3018" | findstr /C:"Puerto" /C:"Port" /C:"Habilitada" /C:"Enabled" /C:"Acci" /C:"Action"

echo.
echo  -----------------------------------------------------------------
echo   Agora estes links funcionam para os outros aparelhos:
echo.
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"IPv4"') do (
  for /f "tokens=1" %%b in ("%%a") do echo    na rede Wi-Fi ..... http://%%b:3018
)
for /f %%t in ('tailscale ip -4 2^>nul') do echo    no Tailscale ...... http://%%t:3018
echo  -----------------------------------------------------------------
echo.
echo  Obs: o servidor precisa estar rodando (run.bat).
echo.
pause
