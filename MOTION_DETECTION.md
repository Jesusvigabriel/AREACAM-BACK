# Sistema de Detección de Movimiento Automático

## 🎯 Descripción General

El sistema de detección de movimiento automático monitorea continuamente las cámaras que están **fuera de su horario de grabación** y envía notificaciones por email cuando detecta movimiento.

## 🔄 Flujo de Funcionamiento

### 1. **Horarios de Grabación**
Cada cámara tiene configurados horarios de grabación por día de la semana:

```
Lunes:    06:00 - 18:00  → Graba continuamente
Martes:   06:00 - 18:00  → Graba continuamente
...
```

### 2. **Detección Fuera de Horario**
Cuando la cámara está **FUERA** de su horario de grabación:
- ✅ El monitor automático la revisa periódicamente (cada 30 segundos por defecto)
- ✅ Si detecta movimiento con FFmpeg, captura un snapshot
- ✅ Envía email con la imagen adjunta

### 3. **Dentro del Horario**
Cuando la cámara está **DENTRO** de su horario de grabación:
- 🔴 Graba continuamente a disco
- ❌ NO envía notificaciones de movimiento (no es necesario)

## ⚙️ Configuración

### Variables de Entorno

```bash
# Habilitar/deshabilitar monitor automático (default: true)
MOTION_AUTO_MONITOR_ENABLED=true

# Intervalo de chequeo en segundos (default: 30)
MOTION_AUTO_MONITOR_INTERVAL=30

# Concurrencia del worker (default: 3)
MOTION_WORKER_CONCURRENCY=3

# Token para endpoint manual de trigger
MOTION_EVENTS_TOKEN=tu_token_secreto
```

### Configuración por Cámara

Cada cámara tiene su propia configuración en la base de datos (campo `details` de la tabla `Monitors`):

```json
{
  "areacam_schedule": {
    "monday": { "recordStart": "06:00", "recordEnd": "18:00" },
    "tuesday": { "recordStart": "06:00", "recordEnd": "18:00" },
    "wednesday": { "recordStart": "06:00", "recordEnd": "18:00" },
    "thursday": { "recordStart": "06:00", "recordEnd": "18:00" },
    "friday": { "recordStart": "06:00", "recordEnd": "18:00" },
    "saturday": { "recordStart": "08:00", "recordEnd": "14:00" },
    "sunday": { "recordStart": null, "recordEnd": null }
  },
  "areacam_motion_enabled": true,
  "areacam_notify_email": true,
  "areacam_motion_sensitivity": 60
}
```

**Parámetros:**
- `areacam_motion_enabled`: Habilita/deshabilita detección de movimiento
- `areacam_notify_email`: Habilita/deshabilita notificaciones por email
- `areacam_motion_sensitivity`: Sensibilidad del detector (0-100, default: 60)
- `areacam_schedule`: Horarios de grabación por día

## 📡 API Endpoints

### GET `/motion-events/auto-monitor/status`
Obtiene el estado del monitor automático.

**Respuesta:**
```json
{
  "ok": true,
  "enabled": true,
  "active": true,
  "intervalSeconds": 30
}
```

### POST `/motion-events/trigger`
Dispara manualmente un evento de movimiento (requiere token).

**Headers:**
```
X-Motion-Token: tu_token_secreto
```

**Body:**
```json
{
  "camera": "camera_id",
  "groupKey": "group_key",
  "source": "manual",
  "snapshotUrl": "https://...",
  "clipUrl": "https://..."
}
```

### GET `/monitors/:mid/settings`
Obtiene la configuración de horarios y detección de una cámara.

### PATCH `/monitors/:mid/settings`
Actualiza la configuración de horarios y detección de una cámara.

**Body:**
```json
{
  "motionEnabled": true,
  "notifyEmail": true,
  "motionSensitivity": 60,
  "schedule": {
    "monday": {
      "recordStart": "06:00",
      "recordEnd": "18:00"
    }
  }
}
```

## 🔍 Algoritmo de Detección

### 1. Monitor Automático (`auto-monitor.ts`)
- Se ejecuta cada N segundos (configurable)
- Consulta todas las cámaras activas (`mode='record'` o `mode='start'`)
- Filtra solo las que tienen `motionEnabled=true`
- Filtra solo las que están **fuera** de su horario de grabación
- Encola un evento de movimiento para cada cámara

### 2. Worker de Procesamiento (`motion-worker.ts`)
- Procesa eventos de la cola con concurrencia configurable
- Verifica que la cámara tenga detección habilitada
- Verifica que tenga notificaciones habilitadas
- **Verifica que esté FUERA del horario de grabación**
- Ejecuta FFmpeg para detectar movimiento real
- Si detecta movimiento, captura snapshot y envía email

### 3. Detector FFmpeg (`detector.ts`)
Usa el filtro `select` de FFmpeg para detectar cambios de escena:

```bash
ffmpeg -i rtsp://camera_url \
  -t 6 \
  -vf "select=gt(scene,0.12)" \
  -frames:v 1 \
  -vsync vfr \
  snapshot.jpg
```

**Sensibilidad:**
- 0% → threshold 0.35 (menos sensible)
- 100% → threshold 0.12 (más sensible)

## 📧 Notificaciones por Email

### Configuración SMTP
Se configura en `/config/notifications-email` (endpoint):

```json
{
  "enabled": true,
  "settings": {
    "smtpHost": "smtp.gmail.com",
    "smtpPort": 587,
    "smtpSecure": false,
    "smtpUser": "tu_email@gmail.com",
    "smtpPassword": "tu_password",
    "fromName": "AreaCam",
    "fromEmail": "no-reply@areacam.local",
    "defaultRecipients": ["admin@example.com"],
    "template": {
      "subject": "🚨 Movimiento detectado - {{camera_name}}",
      "html": "<h1>Movimiento detectado</h1>..."
    }
  }
}
```

### Template Variables
- `{{camera_id}}`: ID de la cámara
- `{{camera_name}}`: Nombre de la cámara
- `{{timestamp}}`: Timestamp del evento
- `{{snapshot_url}}`: URL del snapshot (si existe)
- `{{clip_url}}`: URL del clip (si existe)

## 📁 Almacenamiento

Los snapshots capturados se guardan en:
```
/home/camaras-area54/AREACAM/areacam/backend/storage/motion-events/
```

Formato de nombre: `{timestamp}-{uuid}.jpg`

## 🔧 Troubleshooting

### El monitor no detecta movimiento
1. Verificar que `MOTION_AUTO_MONITOR_ENABLED=true`
2. Verificar que la cámara tenga `motionEnabled=true`
3. Verificar que la cámara tenga `notifyEmail=true`
4. Verificar que la hora actual esté **fuera** del horario de grabación
5. Revisar logs: `pm2 logs areacam-backend`

### No llegan emails
1. Verificar configuración SMTP en `/config/notifications-email`
2. Verificar que `enabled=true` en la configuración
3. Verificar que haya destinatarios configurados
4. Revisar logs del worker: buscar `[motion-email]`

### FFmpeg no detecta movimiento
1. Ajustar sensibilidad (0-100)
2. Verificar que la cámara esté accesible por RTSP
3. Verificar que FFmpeg esté instalado: `ffmpeg -version`
4. Revisar logs: buscar `[motion-worker]`

## 📊 Logs

### Monitor Automático
```
[motion-auto-monitor] Iniciando monitor automático (intervalo: 30s)
[motion-auto-monitor] ✅ Revisadas 5 cámaras fuera de horario, 3 eventos disparados
```

### Worker
```
[motion-worker] Evento descartado (within_recording_schedule) para default:camera1
[motion-worker] Evento descartado (ffmpeg_no_motion) para default:camera2
[motion-worker] Notificación enviada para default:camera3 (status=sent)
```

## 🎯 Ejemplo de Uso

### Escenario: Cámara "Tokio 1"
- **Horario de grabación**: Lunes 06:00-18:00
- **Hora actual**: Lunes 02:34
- **Configuración**: `motionEnabled=true`, `notifyEmail=true`, `sensitivity=60%`

**Comportamiento:**
1. ✅ Monitor automático revisa la cámara cada 30s
2. ✅ Detecta que está fuera de horario (02:34 < 06:00)
3. ✅ Encola evento de movimiento
4. ✅ Worker ejecuta FFmpeg para detectar movimiento
5. ✅ Si detecta movimiento, captura snapshot y envía email
6. 🔴 A las 06:00, la cámara empieza a grabar continuamente
7. ❌ Entre 06:00-18:00 NO envía notificaciones (graba todo)
8. ✅ A las 18:00, vuelve a modo detección

## 🚀 Próximas Mejoras

- [ ] Dashboard web para ver eventos de movimiento
- [ ] Historial de detecciones en base de datos
- [ ] Zonas de detección configurables
- [ ] Integración con webhooks externos
- [ ] Notificaciones push móviles
- [ ] Clips de video en lugar de solo snapshots
