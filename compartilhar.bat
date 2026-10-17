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

set LOG=%LOCALAPPDATA%\Temp\festasemnome_firewall.txt

echo.
echo  ============================================
echo    LIBERANDO A PORTA 3018 NO FIREWALL
echo  ============================================
echo.

echo === %DATE% %TIME% === > "%LOG%"
echo admin=sim >> "%LOG%"

netsh advfirewall firewall delete rule name="FestaSemNome 3018" >> "%LOG%" 2>&1
netsh advfirewall firewall add rule name="FestaSemNome 3018" dir=in action=allow protocol=TCP localport=3018 >> "%LOG%" 2>&1
netsh advfirewall firewall delete rule name="FestaSemNome 3018 UDP" >nul 2>&1
netsh advfirewall firewall add rule name="FestaSemNome 3018 UDP" dir=in action=allow protocol=UDP localport=3018 >> "%LOG%" 2>&1
echo exit_netsh=%errorlevel% >> "%LOG%"

echo.
echo  ---- conferindo (leitura elevada: a leitura sem admin mente) ----
set TMPLOG=%LOG%
powershell -NoProfile -Command "$out = @(); $r = Get-NetFirewallRule -DisplayName 'FestaSemNome*' -ErrorAction SilentlyContinue; if ($r) { foreach ($x in $r) { $pf = $x | Get-NetFirewallPortFilter; $out += ('   OK: ' + $x.DisplayName + ' | ativo=' + $x.Enabled + ' | ' + $x.Action + ' | proto=' + $pf.Protocol + ' porta=' + $pf.LocalPort) } } else { $out += '   ATENCAO: a regra NAO foi criada' }; $out | ForEach-Object { Write-Host $_ }; $out | Out-File -Append -Encoding utf8 $env:TMPLOG"

echo.
echo  -----------------------------------------------------------------
echo   Links para os outros aparelhos (servidor precisa estar rodando):
echo.
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"IPv4"') do (
  for /f "tokens=1" %%b in ("%%a") do echo    Wi-Fi ..... http://%%b:3018
)
for /f %%t in ('tailscale ip -4 2^>nul') do echo    Tailscale . http://%%t:3018
echo  -----------------------------------------------------------------
echo.
echo  Log desta execucao: %LOG%
echo.
pause
