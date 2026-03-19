#!/bin/bash

echo "🔧 Instalando dependencias para detector OpenCV MOG2"
echo "======================================================"
echo ""

# Verificar si Python3 está instalado
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 no está instalado"
    echo "   Instala con: sudo apt install python3 python3-pip"
    exit 1
fi

echo "✅ Python3 encontrado: $(python3 --version)"
echo ""

# Verificar si pip está instalado
if ! command -v pip3 &> /dev/null; then
    echo "⚠️  pip3 no encontrado, instalando..."
    sudo apt update
    sudo apt install -y python3-pip
fi

echo "✅ pip3 encontrado: $(pip3 --version)"
echo ""

# Instalar OpenCV y NumPy
echo "📦 Instalando opencv-python y numpy..."
pip3 install opencv-python numpy

echo ""
echo "✅ Instalación completada"
echo ""
echo "🧪 Probando importación de OpenCV..."
python3 -c "import cv2; print(f'OpenCV version: {cv2.__version__}')" && echo "✅ OpenCV funciona correctamente"

echo ""
echo "📝 Para usar el detector OpenCV:"
echo "   1. Asegúrate de que MOTION_DETECTOR_TYPE=opencv en .env (es el default)"
echo "   2. Reinicia el backend: pm2 restart areacam-backend"
echo ""
