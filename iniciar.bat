@echo off
chcp 65001 >nul
title ParkHub - Estacionamento inteligente
cd /d "%~dp0backend"

echo.
echo   ========================================
echo            P A R K H U B
echo      Estacionamento inteligente
echo   ========================================
echo.

where python >nul 2>nul || (echo [ParkHub] Python nao encontrado. Instale o Python 3.11+ em python.org & goto :erro)

if not exist ".venv\Scripts\python.exe" (
  echo [ParkHub] Criando ambiente Python ^(apenas na primeira execucao^)...
  python -m venv .venv || goto :erro
  ".venv\Scripts\python.exe" -m pip install -q --disable-pip-version-check -r requirements.txt || goto :erro
)

if not exist "%~dp0frontend\dist\index.html" (
  where npm >nul 2>nul || (echo [ParkHub] O frontend nao esta compilado e o Node.js nao foi encontrado. & goto :erro)
  echo [ParkHub] Compilando o frontend...
  pushd "%~dp0frontend"
  call npm install --no-fund --no-audit || goto :erro
  call npm run build || goto :erro
  popd
)

if not exist "data\parkhub.db" (
  echo [ParkHub] Gerando dados de demonstracao...
  ".venv\Scripts\python.exe" -m app.demo || goto :erro
)

echo.
echo [ParkHub] Servidor iniciando em http://localhost:8000
echo [ParkHub] Cliente: cliente / cliente123   ^|   Admin: admin / admin123
echo [ParkHub] Para encerrar, feche esta janela ou pressione Ctrl+C.
echo.
start "" cmd /c "timeout /t 3 >nul & start http://localhost:8000"
".venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000
goto :eof

:erro
echo.
echo [ParkHub] Nao foi possivel iniciar. Verifique as mensagens acima.
pause
