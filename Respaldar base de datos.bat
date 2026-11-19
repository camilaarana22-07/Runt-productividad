@echo off
REM ============================================================
REM  Respaldo de la base de datos RUNT
REM  Doble clic para crear una copia con la fecha y hora.
REM  Las copias quedan en la carpeta "Respaldos RUNT".
REM ============================================================
setlocal
cd /d "%~dp0"

set "ORIGEN=backend\data\runt.db"
set "DESTINO=Respaldos RUNT"

if not exist "%ORIGEN%" (
  echo No se encontro la base de datos en %ORIGEN%.
  echo Asegurese de ejecutar este archivo dentro de la carpeta del proyecto.
  echo.
  pause
  exit /b 1
)

if not exist "%DESTINO%" mkdir "%DESTINO%"

REM Fecha y hora para el nombre (formato AAAA-MM-DD_HH-MM)
for /f "tokens=1-3 delims=/-. " %%a in ("%date%") do set "F=%%c-%%b-%%a"
set "H=%time: =0%"
set "H=%H:~0,2%-%H:~3,2%"
set "SELLO=%F%_%H%"

copy /y "%ORIGEN%" "%DESTINO%\runt_%SELLO%.db" >nul
if exist "%ORIGEN%-wal" copy /y "%ORIGEN%-wal" "%DESTINO%\runt_%SELLO%.db-wal" >nul

echo ============================================================
echo  Respaldo creado correctamente:
echo  %DESTINO%\runt_%SELLO%.db
echo ============================================================
echo.
echo Guarde de vez en cuando una copia de esta carpeta en un USB
echo o en la nube (OneDrive, Google Drive), por seguridad.
echo.
pause
