# ============================================
# AREACAM Backend - Script de Instalación para Windows
# ============================================
# Ejecutar como Administrador en PowerShell

# Configurar política de ejecución si es necesario
# Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  AREACAM Backend - Instalación Windows" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Función para imprimir mensajes
function Print-Success {
    param($Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Print-Error {
    param($Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Print-Info {
    param($Message)
    Write-Host "ℹ $Message" -ForegroundColor Yellow
}

# Verificar que se ejecuta como administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Print-Error "Por favor ejecuta este script como Administrador"
    Print-Info "Click derecho en PowerShell -> 'Ejecutar como administrador'"
    exit 1
}

Print-Info "Iniciando instalación de AREACAM Backend..."
Write-Host ""

# ============================================
# 1. Verificar/Instalar Chocolatey
# ============================================
Print-Info "Paso 1/8: Verificando Chocolatey (gestor de paquetes)..."
if (!(Get-Command choco -ErrorAction SilentlyContinue)) {
    Print-Info "Instalando Chocolatey..."
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    Print-Success "Chocolatey instalado"
} else {
    Print-Success "Chocolatey ya está instalado"
}

# ============================================
# 2. Instalar Node.js
# ============================================
Print-Info "Paso 2/8: Instalando Node.js 18.x..."
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    choco install nodejs-lts -y --version=18.20.0
    refreshenv
    Print-Success "Node.js instalado: $(node -v)"
} else {
    Print-Success "Node.js ya está instalado: $(node -v)"
}

# ============================================
# 3. Instalar MySQL
# ============================================
Print-Info "Paso 3/8: Instalando MySQL Server..."
if (!(Get-Command mysql -ErrorAction SilentlyContinue)) {
    choco install mysql -y
    Print-Success "MySQL instalado"
    Print-Info "Configurando MySQL..."
    
    # Iniciar servicio MySQL
    Start-Service MySQL80
    Set-Service MySQL80 -StartupType Automatic
    
    Print-Info "IMPORTANTE: Configura la contraseña root de MySQL"
    Print-Info "Ejecuta: mysql_secure_installation"
} else {
    Print-Success "MySQL ya está instalado"
}

# ============================================
# 4. Configurar Base de Datos
# ============================================
Print-Info "Paso 4/8: Configurando base de datos..."

# Crear archivo temporal con comandos SQL
$sqlCommands = @"
CREATE DATABASE IF NOT EXISTS ccio;
CREATE USER IF NOT EXISTS 'majesticflame'@'localhost' IDENTIFIED BY 'Flame2020';
GRANT ALL PRIVILEGES ON ccio.* TO 'majesticflame'@'localhost';
FLUSH PRIVILEGES;
"@

$sqlCommands | Out-File -FilePath "temp_setup.sql" -Encoding UTF8

# Ejecutar comandos SQL
try {
    Print-Info "Creando base de datos y usuario..."
    mysql -u root -e "source temp_setup.sql" 2>$null
    
    # Importar esquema
    if (Test-Path "database\schema.sql") {
        mysql -u root ccio -e "source database\schema.sql" 2>$null
        Print-Success "Esquema de base de datos importado"
    }
    
    # Importar datos iniciales
    if (Test-Path "database\initial-data.sql") {
        mysql -u root ccio -e "source database\initial-data.sql" 2>$null
        Print-Success "Datos iniciales importados (cámaras configuradas)"
    }
    
    # Ejecutar migraciones
    if (Test-Path "migration-cluster.sql") {
        mysql -u root ccio -e "source migration-cluster.sql" 2>$null
        Print-Success "Migraciones de cluster aplicadas"
    }
    
    Print-Success "Base de datos configurada"
} catch {
    Print-Info "Si hay errores de MySQL, ejecuta manualmente:"
    Print-Info "mysql -u root -p < database\schema.sql"
} finally {
    Remove-Item "temp_setup.sql" -ErrorAction SilentlyContinue
}

# ============================================
# 5. Instalar dependencias de Node.js
# ============================================
Print-Info "Paso 5/8: Instalando dependencias de Node.js..."
npm install --silent
Print-Success "Dependencias de Node.js instaladas"

# ============================================
# 6. Compilar TypeScript
# ============================================
Print-Info "Paso 6/8: Compilando TypeScript..."
npm run build
Print-Success "Código compilado"

# ============================================
# 7. Instalar PM2
# ============================================
Print-Info "Paso 7/8: Instalando PM2..."
if (!(Get-Command pm2 -ErrorAction SilentlyContinue)) {
    npm install -g pm2
    npm install -g pm2-windows-startup
    
    # Configurar PM2 para inicio automático en Windows
    pm2-startup install
    Print-Success "PM2 instalado y configurado para inicio automático"
} else {
    Print-Success "PM2 ya está instalado"
}

# ============================================
# 8. Configurar Firewall de Windows
# ============================================
Print-Info "Paso 8/8: Configurando Firewall de Windows..."

try {
    # Backend API
    New-NetFirewallRule -DisplayName "AREACAM Backend API" -Direction Inbound -LocalPort 4000 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue
    
    # MediaMTX RTSP
    New-NetFirewallRule -DisplayName "MediaMTX RTSP" -Direction Inbound -LocalPort 8554 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue
    
    # MediaMTX HLS
    New-NetFirewallRule -DisplayName "MediaMTX HLS" -Direction Inbound -LocalPort 8888 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue
    
    # MediaMTX WebRTC
    New-NetFirewallRule -DisplayName "MediaMTX WebRTC" -Direction Inbound -LocalPort 8889 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue
    
    Print-Success "Reglas de firewall configuradas"
} catch {
    Print-Info "Configuración de firewall manual puede ser necesaria"
}

# ============================================
# Instalación completada
# ============================================
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  ¡Instalación completada exitosamente!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

Write-Host "📋 Próximos pasos:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Editar configuración (si es necesario):" -ForegroundColor White
Write-Host "   notepad .env" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Iniciar el backend:" -ForegroundColor White
Write-Host "   pm2 start dist\index.js --name areacam-backend" -ForegroundColor Gray
Write-Host "   pm2 save" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Ver logs:" -ForegroundColor White
Write-Host "   pm2 logs areacam-backend" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Verificar estado:" -ForegroundColor White
Write-Host "   pm2 status" -ForegroundColor Gray
Write-Host "   curl http://localhost:4000/health" -ForegroundColor Gray
Write-Host ""
Write-Host "📌 Información importante:" -ForegroundColor Cyan
Write-Host "   - Base de datos: ccio" -ForegroundColor White
Write-Host "   - Usuario DB: majesticflame" -ForegroundColor White
Write-Host "   - Puerto API: 4000" -ForegroundColor White
Write-Host "   - Todas las cámaras están preconfiguradas" -ForegroundColor White
Write-Host ""
Write-Host "🔥 Para iniciar ahora mismo:" -ForegroundColor Yellow
Write-Host "   pm2 start dist\index.js --name areacam-backend" -ForegroundColor Gray
Write-Host "   pm2 save" -ForegroundColor Gray
Write-Host ""
