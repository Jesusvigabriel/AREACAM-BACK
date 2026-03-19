@echo off
REM ============================================
REM AREACAM Backend - Script de Instalación para Windows (CMD)
REM ============================================
REM Ejecutar como Administrador

echo ============================================
echo   AREACAM Backend - Instalacion Windows
echo ============================================
echo.

REM Verificar privilegios de administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Este script requiere privilegios de administrador
    echo Click derecho en el archivo y selecciona "Ejecutar como administrador"
    pause
    exit /b 1
)

echo [INFO] Iniciando instalacion de AREACAM Backend...
echo.

REM ============================================
REM 1. Verificar Node.js
REM ============================================
echo [INFO] Paso 1/6: Verificando Node.js...
where node >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Node.js no esta instalado
    echo.
    echo Por favor instala Node.js 18.x desde:
    echo https://nodejs.org/dist/v18.20.0/node-v18.20.0-x64.msi
    echo.
    pause
    exit /b 1
) else (
    node -v
    echo [OK] Node.js instalado
)
echo.

REM ============================================
REM 2. Verificar MySQL
REM ============================================
echo [INFO] Paso 2/6: Verificando MySQL...
where mysql >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] MySQL no esta instalado
    echo.
    echo Por favor instala MySQL desde:
    echo https://dev.mysql.com/downloads/installer/
    echo.
    pause
    exit /b 1
) else (
    mysql --version
    echo [OK] MySQL instalado
)
echo.

REM ============================================
REM 3. Configurar Base de Datos
REM ============================================
echo [INFO] Paso 3/6: Configurando base de datos...
echo.
echo Ingresa la contrasena root de MySQL:
set /p MYSQL_ROOT_PASS=

REM Crear base de datos y usuario
mysql -u root -p%MYSQL_ROOT_PASS% -e "CREATE DATABASE IF NOT EXISTS ccio;" 2>nul
mysql -u root -p%MYSQL_ROOT_PASS% -e "CREATE USER IF NOT EXISTS 'majesticflame'@'localhost' IDENTIFIED BY 'Flame2020';" 2>nul
mysql -u root -p%MYSQL_ROOT_PASS% -e "GRANT ALL PRIVILEGES ON ccio.* TO 'majesticflame'@'localhost';" 2>nul
mysql -u root -p%MYSQL_ROOT_PASS% -e "FLUSH PRIVILEGES;" 2>nul

if exist "database\schema.sql" (
    echo [INFO] Importando esquema de base de datos...
    mysql -u root -p%MYSQL_ROOT_PASS% ccio < database\schema.sql 2>nul
    echo [OK] Esquema importado
)

if exist "database\initial-data.sql" (
    echo [INFO] Importando datos iniciales (camaras)...
    mysql -u root -p%MYSQL_ROOT_PASS% ccio < database\initial-data.sql 2>nul
    echo [OK] Datos iniciales importados
)

if exist "migration-cluster.sql" (
    echo [INFO] Aplicando migraciones de cluster...
    mysql -u root -p%MYSQL_ROOT_PASS% ccio < migration-cluster.sql 2>nul
    echo [OK] Migraciones aplicadas
)

echo [OK] Base de datos configurada
echo.

REM ============================================
REM 4. Instalar dependencias de Node.js
REM ============================================
echo [INFO] Paso 4/6: Instalando dependencias de Node.js...
call npm install
if %errorLevel% neq 0 (
    echo [ERROR] Error instalando dependencias
    pause
    exit /b 1
)
echo [OK] Dependencias instaladas
echo.

REM ============================================
REM 5. Compilar TypeScript
REM ============================================
echo [INFO] Paso 5/6: Compilando TypeScript...
call npm run build
if %errorLevel% neq 0 (
    echo [ERROR] Error compilando codigo
    pause
    exit /b 1
)
echo [OK] Codigo compilado
echo.

REM ============================================
REM 6. Instalar PM2
REM ============================================
echo [INFO] Paso 6/6: Instalando PM2...
where pm2 >nul 2>&1
if %errorLevel% neq 0 (
    call npm install -g pm2
    call npm install -g pm2-windows-startup
    call pm2-startup install
    echo [OK] PM2 instalado
) else (
    echo [OK] PM2 ya esta instalado
)
echo.

REM ============================================
REM Configurar Firewall
REM ============================================
echo [INFO] Configurando reglas de firewall...
netsh advfirewall firewall add rule name="AREACAM Backend API" dir=in action=allow protocol=TCP localport=4000 >nul 2>&1
netsh advfirewall firewall add rule name="MediaMTX RTSP" dir=in action=allow protocol=TCP localport=8554 >nul 2>&1
netsh advfirewall firewall add rule name="MediaMTX HLS" dir=in action=allow protocol=TCP localport=8888 >nul 2>&1
netsh advfirewall firewall add rule name="MediaMTX WebRTC" dir=in action=allow protocol=TCP localport=8889 >nul 2>&1
echo [OK] Reglas de firewall configuradas
echo.

REM ============================================
REM Instalación completada
REM ============================================
echo ============================================
echo   Instalacion completada exitosamente!
echo ============================================
echo.
echo Proximos pasos:
echo.
echo 1. Editar configuracion (si es necesario):
echo    notepad .env
echo.
echo 2. Iniciar el backend:
echo    pm2 start dist\index.js --name areacam-backend
echo    pm2 save
echo.
echo 3. Ver logs:
echo    pm2 logs areacam-backend
echo.
echo 4. Verificar estado:
echo    pm2 status
echo.
echo Informacion importante:
echo    - Base de datos: ccio
echo    - Usuario DB: majesticflame
echo    - Puerto API: 4000
echo    - Todas las camaras estan preconfiguradas
echo.
echo Para iniciar ahora mismo:
echo    pm2 start dist\index.js --name areacam-backend
echo    pm2 save
echo.
pause
