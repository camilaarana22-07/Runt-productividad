@echo off
REM ============================================================
REM  Iniciar RUNT para uso en la oficina (red local)
REM  1) Compila el frontend (solo la primera vez o tras cambios)
REM  2) Enciende el servidor, que ya sirve la aplicacion completa
REM  Los operadores entran desde: http://LA-IP-DE-ESTE-PC:3000
REM ============================================================
cd /d "%~dp0"

echo Compilando la aplicacion (puede tardar un minuto)...
cd frontend
call npm run build
if errorlevel 1 (
  echo.
  echo Hubo un error al compilar. Revise el mensaje de arriba.
  pause
  exit /b 1
)
cd ..

echo.
echo ============================================================
echo  Direccion para los operadores de la oficina:
echo.
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do echo    http://%%a:3000
echo.
echo  (elija la que empiece por 192.168 o 10.)
echo ============================================================
echo.
echo Deje esta ventana ABIERTA mientras usen el sistema.
echo.

cd backend
call npm start
