#!/bin/bash

RTSP_URL="rtsp://admin:Tokio2024@192.168.1.11:554/Streaming/Channels/101"
OUTPUT_DIR="/home/camaras-area54/AREACAM/areacam/backend/storage/motion-events"
TIMESTAMP=$(date +%s)

mkdir -p "$OUTPUT_DIR"

echo "🧪 Probando diferentes métodos de detección de movimiento"
echo "=========================================================="
echo ""

# Método 1: mpdecimate (actual)
echo "1️⃣  Método mpdecimate (actual)..."
ffmpeg -hide_banner -loglevel error -rtsp_transport tcp -i "$RTSP_URL" -t 3 \
  -vf "scale=640:360,mpdecimate=hi=15:lo=7:frac=0.33" \
  -vsync vfr -frames:v 1 -y "$OUTPUT_DIR/test-mpdecimate-$TIMESTAMP.jpg" 2>&1

if [ -f "$OUTPUT_DIR/test-mpdecimate-$TIMESTAMP.jpg" ] && [ -s "$OUTPUT_DIR/test-mpdecimate-$TIMESTAMP.jpg" ]; then
  SIZE=$(stat -c%s "$OUTPUT_DIR/test-mpdecimate-$TIMESTAMP.jpg")
  echo "   ✅ Detectado ($SIZE bytes)"
else
  echo "   ❌ No detectado"
fi

echo ""

# Método 2: Captura simple de 2 frames y comparación
echo "2️⃣  Método captura directa (siempre detecta)..."
ffmpeg -hide_banner -loglevel error -rtsp_transport tcp -i "$RTSP_URL" \
  -frames:v 1 -y "$OUTPUT_DIR/test-simple-$TIMESTAMP.jpg" 2>&1

if [ -f "$OUTPUT_DIR/test-simple-$TIMESTAMP.jpg" ] && [ -s "$OUTPUT_DIR/test-simple-$TIMESTAMP.jpg" ]; then
  SIZE=$(stat -c%s "$OUTPUT_DIR/test-simple-$TIMESTAMP.jpg")
  echo "   ✅ Capturado ($SIZE bytes)"
else
  echo "   ❌ Error"
fi

echo ""
echo "📁 Archivos generados en: $OUTPUT_DIR"
ls -lh "$OUTPUT_DIR"/test-*-$TIMESTAMP.jpg 2>/dev/null || echo "   (ninguno)"
