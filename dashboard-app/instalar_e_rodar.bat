@echo off
cd /d "%~dp0"

if exist node_modules (
  echo === limpando node_modules (upgrade major do Next) ===
  rmdir /s /q node_modules
)

echo === npm install ===
call npm install
if errorlevel 1 (
  echo.
  echo FALHOU o npm install.
  pause
  exit /b 1
)
echo.
echo === npm run dev ===
call npm run dev
pause
