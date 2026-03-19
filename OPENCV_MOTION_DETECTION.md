# Detector de Movimiento con OpenCV MOG2

## 🎯 Descripción

Sistema profesional de detección de movimiento usando **OpenCV Background Subtraction (MOG2)** para videovigilancia.

### ¿Por qué OpenCV MOG2?

**Problema con FFmpeg:**
- FFmpeg usa filtro `scene` o `mpdecimate` que detectan cambios de escena completa
- No detecta movimiento de objetos individuales (personas, vehículos)
- Muchos falsos negativos (no detecta personas moviéndose)

**Solución con OpenCV MOG2:**
- ✅ Algoritmo específico para videovigilancia
- ✅ Detecta objetos en movimiento (personas, vehículos, animales)
- ✅ Elimina ruido (hojas, lluvia, sombras)
- ✅ Configurable: sensibilidad, área mínima, duración
- ✅ Proporciona estadísticas detalladas

---

## 🏗️ Arquitectura

```
┌─────────────────┐
│  Cámara RTSP    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  motion-worker.ts (Node.js)             │
│  - Recibe evento de detección           │
│  - Verifica configuración               │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  detector-opencv.ts (TypeScript)        │
│  - Wrapper que llama script Python      │
│  - Maneja timeout y errores             │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  motion_detector_opencv.py (Python)     │
│  - Captura 5 segundos de video RTSP    │
│  - Aplica MOG2 Background Subtraction   │
│  - Detecta contornos de objetos         │
│  - Filtra por área mínima               │
│  - Guarda snapshot del mejor frame      │
│  - Retorna JSON con resultado           │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  motion-email.ts                        │
│  - Envía correo con snapshot adjunto    │
└─────────────────────────────────────────┘
```

---

## 📦 Instalación

### 1. Instalar dependencias Python

```bash
cd /home/camaras-area54/AREACAM/areacam/backend
chmod +x scripts/install-opencv.sh
./scripts/install-opencv.sh
```

O manualmente:
```bash
pip3 install opencv-python numpy
```

### 2. Dar permisos al script Python

```bash
chmod +x scripts/motion_detector_opencv.py
```

### 3. Compilar TypeScript

```bash
npm run build
```

### 4. Reiniciar backend

```bash
pm2 restart areacam-backend
```

---

## ⚙️ Configuración

### Variables de Entorno

En `backend/.env`:

```bash
# Tipo de detector: 'opencv' (default) o 'ffmpeg'
MOTION_DETECTOR_TYPE=opencv

# Intervalo de chequeo automático (segundos)
MOTION_AUTO_MONITOR_INTERVAL=30
```

### Configuración por Cámara

En la interfaz web o vía API:

- **Sensibilidad (0-100)**: 
  - 0-30: Baja (solo objetos grandes)
  - 31-60: Media (objetos medianos)
  - 61-100: Alta (objetos pequeños)
  
- **Área mínima automática**:
  - Sensibilidad 100 → 300px (muy sensible)
  - Sensibilidad 50 → 1150px (medio)
  - Sensibilidad 0 → 2000px (poco sensible)

---

## 🔍 Algoritmo MOG2

### ¿Cómo funciona?

1. **Background Model**: Construye un modelo estadístico del fondo (background)
2. **Foreground Detection**: Identifica píxeles que difieren significativamente del fondo
3. **Shadow Removal**: Elimina sombras detectadas
4. **Morphological Operations**: Reduce ruido con operaciones de apertura/cierre
5. **Contour Detection**: Encuentra contornos de objetos en movimiento
6. **Area Filtering**: Filtra contornos por área mínima

### Parámetros Clave

```python
backSub = cv2.createBackgroundSubtractorMOG2(
    history=500,              # Frames para modelo de background
    varThreshold=4-40,        # Umbral de varianza (más bajo = más sensible)
    detectShadows=True        # Detectar y eliminar sombras
)
```

### Ventajas sobre FFmpeg

| Característica | FFmpeg | OpenCV MOG2 |
|----------------|--------|-------------|
| Detecta personas | ❌ | ✅ |
| Detecta vehículos | ❌ | ✅ |
| Elimina sombras | ❌ | ✅ |
| Reduce ruido | ❌ | ✅ |
| Área mínima configurable | ❌ | ✅ |
| Estadísticas detalladas | ❌ | ✅ |
| Velocidad | Rápido | Medio |

---

## 🧪 Pruebas

### Prueba Manual

```bash
cd /home/camaras-area54/AREACAM/areacam/backend

python3 scripts/motion_detector_opencv.py \
  --rtsp-url "rtsp://admin:Alfahc2021@192.168.21.200:554/cam/realmonitor?channel=1&subtype=0" \
  --output "/tmp/test-motion.jpg" \
  --sensitivity 70 \
  --min-area 500 \
  --duration 5
```

**Salida esperada:**
```json
{
  "motion_detected": true,
  "snapshot_path": "/tmp/test-motion.jpg",
  "motion_frames": 45,
  "total_frames": 75,
  "max_contour_area": 15234,
  "error": null
}
```

### Verificar en Logs

```bash
pm2 logs areacam-backend --lines 50
```

Buscar:
```
[opencv-detector] Analizando 75 frames (~5s) con sensibilidad 70%
[opencv-detector] ✅ MOVIMIENTO DETECTADO: 45/75 frames, área máxima: 15234px
[motion-worker] 🎯 MOVIMIENTO DETECTADO con OPENCV
[motion-worker] 📊 Frames con movimiento: 45/75
```

---

## 📊 Resultado JSON

El script Python retorna:

```json
{
  "motion_detected": true,           // ¿Se detectó movimiento?
  "snapshot_path": "/path/to/img.jpg", // Ruta del snapshot guardado
  "motion_frames": 45,                // Frames con movimiento
  "total_frames": 75,                 // Total de frames analizados
  "max_contour_area": 15234,          // Área máxima detectada (píxeles)
  "error": null                       // Error si ocurrió alguno
}
```

---

## 🐛 Troubleshooting

### Error: "ModuleNotFoundError: No module named 'cv2'"

**Solución:**
```bash
pip3 install opencv-python
```

### Error: "No se pudo abrir el stream RTSP"

**Causas:**
- URL RTSP incorrecta
- Credenciales incorrectas
- Cámara no accesible en la red

**Verificar:**
```bash
ffmpeg -i "rtsp://user:pass@ip:port/path" -frames:v 1 test.jpg
```

### No detecta movimiento

**Ajustar sensibilidad:**
- Aumentar sensibilidad en la interfaz web (70-90)
- Reducir área mínima manualmente en el script

**Verificar logs:**
```bash
pm2 logs areacam-backend | grep opencv-detector
```

### Timeout

**Aumentar timeout:**
En `detector-opencv.ts`:
```typescript
const timeoutMs = options.timeoutMs ?? 15000; // 15 segundos
```

---

## 🔄 Comparación de Detectores

### FFmpeg (mpdecimate)
```bash
# Pros: Rápido, sin dependencias extra
# Cons: No detecta objetos individuales, muchos falsos negativos
MOTION_DETECTOR_TYPE=ffmpeg
```

### OpenCV MOG2 (Recomendado)
```bash
# Pros: Detecta objetos, preciso, configurable
# Cons: Requiere Python + OpenCV, más lento
MOTION_DETECTOR_TYPE=opencv
```

---

## 📈 Próximas Mejoras

1. **Zonas de detección**: Máscaras para ignorar áreas específicas
2. **Clasificación de objetos**: Diferenciar personas de vehículos
3. **Detección con IA**: Integrar YOLO o TensorFlow Lite
4. **Tracking**: Seguimiento de objetos entre frames
5. **Análisis de trayectorias**: Detectar comportamientos sospechosos

---

## 📚 Referencias

- [OpenCV Background Subtraction](https://docs.opencv.org/4.x/d1/dc5/tutorial_background_subtraction.html)
- [MOG2 Algorithm](https://docs.opencv.org/4.x/d7/d7b/classcv_1_1BackgroundSubtractorMOG2.html)
- [Motion Detection Tutorial](https://www.pyimagesearch.com/2015/05/25/basic-motion-detection-and-tracking-with-python-and-opencv/)
