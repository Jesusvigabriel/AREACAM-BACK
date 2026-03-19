#!/bin/bash

# ============================================
# AREACAM Backend - Script de Instalación Automática
# ============================================

set -e  # Detener en caso de error

echo "============================================"
echo "  AREACAM Backend - Instalación Automática"
echo "============================================"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Verificar que se ejecuta como root
if [ "$EUID" -ne 0 ]; then 
    print_error "Por favor ejecuta este script como root (sudo ./install.sh)"
    exit 1
fi

print_info "Iniciando instalación de AREACAM Backend..."
echo ""

# ============================================
# 1. Actualizar sistema
# ============================================
print_info "Paso 1/8: Actualizando sistema..."
apt-get update -qq
print_success "Sistema actualizado"

# ============================================
# 2. Instalar dependencias del sistema
# ============================================
print_info "Paso 2/8: Instalando dependencias del sistema..."
apt-get install -y -qq curl wget git build-essential > /dev/null 2>&1
print_success "Dependencias instaladas"

# ============================================
# 3. Instalar Node.js 18.x
# ============================================
print_info "Paso 3/8: Instalando Node.js 18.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - > /dev/null 2>&1
    apt-get install -y -qq nodejs > /dev/null 2>&1
    print_success "Node.js $(node -v) instalado"
else
    print_success "Node.js $(node -v) ya está instalado"
fi

# ============================================
# 4. Instalar MySQL
# ============================================
print_info "Paso 4/8: Instalando MySQL Server..."
if ! command -v mysql &> /dev/null; then
    export DEBIAN_FRONTEND=noninteractive
    apt-get install -y -qq mysql-server > /dev/null 2>&1
    systemctl start mysql
    systemctl enable mysql
    print_success "MySQL instalado y ejecutándose"
else
    print_success "MySQL ya está instalado"
fi

# ============================================
# 5. Configurar Base de Datos
# ============================================
print_info "Paso 5/8: Configurando base de datos..."

# Crear usuario y base de datos
mysql -e "CREATE DATABASE IF NOT EXISTS ccio;" 2>/dev/null || true
mysql -e "CREATE USER IF NOT EXISTS 'majesticflame'@'localhost' IDENTIFIED BY 'Flame2020';" 2>/dev/null || true
mysql -e "GRANT ALL PRIVILEGES ON ccio.* TO 'majesticflame'@'localhost';" 2>/dev/null || true
mysql -e "FLUSH PRIVILEGES;" 2>/dev/null || true

# Importar esquema
if [ -f "database/schema.sql" ]; then
    mysql ccio < database/schema.sql 2>/dev/null || true
    print_success "Esquema de base de datos importado"
fi

# Importar datos iniciales (cámaras, usuarios, etc.)
if [ -f "database/initial-data.sql" ]; then
    mysql ccio < database/initial-data.sql 2>/dev/null || true
    print_success "Datos iniciales importados (cámaras configuradas)"
fi

# Ejecutar migraciones adicionales
if [ -f "migration-cluster.sql" ]; then
    mysql ccio < migration-cluster.sql 2>/dev/null || true
    print_success "Migraciones de cluster aplicadas"
fi

print_success "Base de datos configurada"

# ============================================
# 6. Instalar dependencias de Node.js
# ============================================
print_info "Paso 6/8: Instalando dependencias de Node.js..."
npm install --silent > /dev/null 2>&1
print_success "Dependencias de Node.js instaladas"

# ============================================
# 7. Compilar TypeScript
# ============================================
print_info "Paso 7/8: Compilando TypeScript..."
npm run build > /dev/null 2>&1
print_success "Código compilado"

# ============================================
# 8. Instalar y configurar PM2
# ============================================
print_info "Paso 8/8: Configurando PM2 para ejecución automática..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2 --silent > /dev/null 2>&1
    print_success "PM2 instalado"
else
    print_success "PM2 ya está instalado"
fi

# Configurar PM2 para iniciar en boot
pm2 startup systemd -u $SUDO_USER --hp /home/$SUDO_USER > /dev/null 2>&1 || true
print_success "PM2 configurado para inicio automático"

# ============================================
# 9. Configurar firewall (opcional)
# ============================================
print_info "Configurando firewall..."
if command -v ufw &> /dev/null; then
    ufw allow 4000/tcp comment 'AREACAM Backend API' > /dev/null 2>&1 || true
    ufw allow 8554/tcp comment 'MediaMTX RTSP' > /dev/null 2>&1 || true
    ufw allow 8888/tcp comment 'MediaMTX HLS' > /dev/null 2>&1 || true
    ufw allow 8889/tcp comment 'MediaMTX WebRTC' > /dev/null 2>&1 || true
    print_success "Puertos abiertos en firewall"
else
    print_info "UFW no instalado, saltando configuración de firewall"
fi

# ============================================
# Instalación completada
# ============================================
echo ""
echo "============================================"
print_success "¡Instalación completada exitosamente!"
echo "============================================"
echo ""
echo "📋 Próximos pasos:"
echo ""
echo "1. Editar configuración (si es necesario):"
echo "   nano .env"
echo ""
echo "2. Iniciar el backend:"
echo "   pm2 start dist/index.js --name areacam-backend"
echo "   pm2 save"
echo ""
echo "3. Ver logs:"
echo "   pm2 logs areacam-backend"
echo ""
echo "4. Verificar estado:"
echo "   pm2 status"
echo "   curl http://localhost:4000/health"
echo ""
echo "📌 Información importante:"
echo "   - Base de datos: ccio"
echo "   - Usuario DB: majesticflame"
echo "   - Puerto API: 4000"
echo "   - Todas las cámaras están preconfiguradas"
echo ""
echo "🔥 Para iniciar ahora mismo:"
echo "   pm2 start dist/index.js --name areacam-backend && pm2 save"
echo ""
