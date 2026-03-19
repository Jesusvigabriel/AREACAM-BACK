#!/usr/bin/env python3
"""
Prueba de detector OpenCV usando stream HLS de MediaMTX
"""

import cv2
import sys

# Stream HLS local de MediaMTX para TOKIO-06
hls_url = "http://localhost:8888/4RLoWZSKBU/index.m3u8"

print(f"🔍 Probando detector OpenCV con HLS")
print(f"📹 URL: {hls_url}")
print("")

print("⏳ Abriendo stream HLS...")
cap = cv2.VideoCapture(hls_url)

if not cap.isOpened():
    print("❌ ERROR: No se pudo abrir el stream HLS")
    sys.exit(1)

print("✅ Stream HLS abierto correctamente")
print("")

# Leer algunos frames para probar
print("📸 Capturando frames de prueba...")
for i in range(5):
    ret, frame = cap.read()
    if ret:
        print(f"   Frame {i+1}: {frame.shape[1]}x{frame.shape[0]} píxeles")
    else:
        print(f"   Frame {i+1}: ❌ Error al leer")
        break

cap.release()

if ret:
    print("")
    print("✅ Stream HLS funciona correctamente con OpenCV!")
    print("💡 Ahora podemos usar HLS en lugar de RTSP directo")
else:
    print("")
    print("❌ Problemas leyendo frames del stream HLS")
