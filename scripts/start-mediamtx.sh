#!/bin/bash

# Script para iniciar MediaMTX con la configuración de AreaCam

MEDIAMTX_BIN="/home/camaras-area54/mediamtx"
CONFIG_FILE="/home/camaras-area54/mediamtx_areacam.yml"
LOG_DIR="/home/camaras-area54/mediamtx-logs"

# Crear directorio de logs si no existe
mkdir -p "$LOG_DIR"

# Verificar si MediaMTX ya está corriendo con nuestra configuración
if pgrep -f "mediamtx.*mediamtx_areacam.yml" > /dev/null; then
    echo "⚠️  MediaMTX ya está corriendo con la configuración correcta"
    echo "Para reiniciar, primero detén el proceso con: pkill mediamtx"
    exit 1
fi

# Si hay otro MediaMTX corriendo, advertir pero continuar
if pgrep -f "mediamtx" > /dev/null; then
    echo "⚠️  Detectado MediaMTX con otra configuración, deteniéndolo..."
    pkill -9 mediamtx
    sleep 2
fi

# Verificar que el binario existe
if [ ! -f "$MEDIAMTX_BIN" ]; then
    echo "❌ No se encontró el binario de MediaMTX en: $MEDIAMTX_BIN"
    exit 1
fi

# Verificar que el archivo de configuración existe
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ No se encontró el archivo de configuración en: $CONFIG_FILE"
    exit 1
fi

echo "🚀 Iniciando MediaMTX..."
echo "📝 Configuración: $CONFIG_FILE"
echo "📋 Logs: $LOG_DIR/mediamtx.log"

# Iniciar MediaMTX en segundo plano
nohup "$MEDIAMTX_BIN" "$CONFIG_FILE" > /dev/null 2>&1 &

# Esperar un momento para verificar que inició correctamente
sleep 2

if pgrep -f "mediamtx" > /dev/null; then
    echo "✅ MediaMTX iniciado correctamente"
    echo ""
    echo "Puertos:"
    echo "  - RTSP: 8554"
    echo "  - HLS:  8888"
    echo "  - WebRTC: 8889"
    echo "  - API: 9997"
    echo "  - Métricas: 9998"
    echo ""
    echo "Para detener: pkill mediamtx"
else
    echo "❌ Error al iniciar MediaMTX"
    echo "Revisa los logs en: $LOG_DIR/mediamtx.log"
    exit 1
fi
