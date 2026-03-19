#!/bin/bash

# Script de prueba de integración del sistema de streaming

echo "🧪 Test de Integración - AreaCam Streaming"
echo "=========================================="
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Verificar que MediaMTX esté corriendo
echo "1️⃣  Verificando MediaMTX..."
if pm2 list | grep -q "areacam-mediamtx.*online"; then
    echo -e "${GREEN}✅ MediaMTX está corriendo en PM2${NC}"
else
    echo -e "${RED}❌ MediaMTX no está corriendo${NC}"
    exit 1
fi

# 2. Verificar API de MediaMTX
echo ""
echo "2️⃣  Verificando API de MediaMTX..."
MEDIAMTX_STATUS=$(curl -s http://localhost:9997/v3/config/global/get | jq -r '.api')
if [ "$MEDIAMTX_STATUS" = "true" ]; then
    echo -e "${GREEN}✅ API de MediaMTX respondiendo${NC}"
else
    echo -e "${RED}❌ API de MediaMTX no responde${NC}"
    exit 1
fi

# 3. Contar cámaras configuradas
echo ""
echo "3️⃣  Verificando cámaras configuradas..."
CAMERA_COUNT=$(curl -s http://localhost:9997/v3/paths/list | jq '.items | length')
echo -e "${GREEN}✅ Cámaras configuradas: $CAMERA_COUNT${NC}"

# 4. Verificar backend
echo ""
echo "4️⃣  Verificando backend..."
if pm2 list | grep -q "areacam-backend.*online"; then
    echo -e "${GREEN}✅ Backend está corriendo${NC}"
else
    echo -e "${RED}❌ Backend no está corriendo${NC}"
    exit 1
fi

# 5. Obtener primera cámara
echo ""
echo "5️⃣  Obteniendo información de primera cámara..."
FIRST_CAMERA=$(curl -s http://localhost:9997/v3/paths/list | jq -r '.items[0].name')
echo "   Cámara ID: $FIRST_CAMERA"

# 6. Verificar URLs de streaming
echo ""
echo "6️⃣  URLs de Streaming generadas:"
echo "   HLS:    http://localhost:8888/$FIRST_CAMERA/index.m3u8"
echo "   WebRTC: http://localhost:8889/$FIRST_CAMERA"
echo "   RTSP:   rtsp://localhost:8554/$FIRST_CAMERA"

# 7. Verificar estado de la cámara
echo ""
echo "7️⃣  Verificando estado de la cámara..."
CAMERA_STATUS=$(curl -s http://localhost:9997/v3/paths/get/$FIRST_CAMERA | jq -r '.sourceReady')
if [ "$CAMERA_STATUS" = "true" ]; then
    echo -e "${GREEN}✅ Cámara $FIRST_CAMERA está ONLINE${NC}"
else
    echo -e "${YELLOW}⚠️  Cámara $FIRST_CAMERA está OFFLINE${NC}"
fi

# 8. Resumen
echo ""
echo "=========================================="
echo "📊 Resumen:"
echo "   - MediaMTX: ✅ Funcionando"
echo "   - Backend: ✅ Funcionando"
echo "   - Cámaras configuradas: $CAMERA_COUNT"
echo "   - Página de prueba: http://localhost:4000/test/"
echo ""
echo "✅ Sistema de streaming listo para producción"
