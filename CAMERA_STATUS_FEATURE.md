# Sistema de Detección de Estado de Cámaras

## Fecha: 31 de Octubre 2025

## Problema Identificado

Las cámaras que no están disponibles (sin conexión de red, timeout, etc.) aparecían como disponibles en el frontend, pero al intentar ver el video no se podía reproducir. El usuario no tenía forma de saber qué cámaras tenían problemas de conexión antes de intentar verlas.

## Solución Implementada

### 1. Servicio de Análisis de Logs de MediaMTX

**Archivo:** `/home/camaras-area54/AREACAM/areacam/backend/src/services/camera-status.ts`

Este servicio parsea los logs de MediaMTX para identificar cámaras con errores de conexión:

#### Tipos de Errores Detectados:
- **timeout**: `i/o timeout` - La cámara no responde
- **no_route**: `no route to host` - Problemas de red/routing
- **connection_refused**: `connection refused` - La cámara rechaza la conexión
- **tcp_timeout**: `TCP timeout` - Timeout en la conexión TCP
- **unknown**: Otros errores de conexión

#### Funciones Principales:

```typescript
// Obtener estado de todas las cámaras desde los logs
getCameraStatusFromLogs(): Promise<Map<string, CameraStatus>>

// Obtener estado de una cámara específica
getCameraStatus(cameraId: string): Promise<CameraStatus>

// Obtener lista de cámaras offline
getOfflineCameras(): Promise<CameraStatus[]>

// Obtener estadísticas generales
getCameraStats(): Promise<{
  total: number;
  online: number;
  offline: number;
  offlineByType: Record<string, number>;
}>

// Traducir tipo de error a mensaje amigable
getErrorMessage(errorType?: string): string
```

#### Características:
- ✅ Parsea las últimas 500 líneas del log de MediaMTX
- ✅ Solo considera errores de los últimos 5 minutos
- ✅ Extrae timestamp de cada error
- ✅ Identifica el tipo de error específico
- ✅ Mensajes de error en español

### 2. Integración en Endpoint de Monitores

**Archivo:** `/home/camaras-area54/AREACAM/areacam/backend/src/routes/monitors.ts`

#### GET /monitors
Ahora incluye el estado de cada cámara:

```json
{
  "ok": true,
  "monitors": [
    {
      "mid": "c2iFrRcz5K",
      "name": "CAM-LONDRES-01",
      "status": {
        "isOnline": false,
        "errorMessage": "Error de conexión",
        "lastErrorTime": "2025-10-31T14:36:25.000Z"
      },
      // ... otros campos del monitor
    }
  ]
}
```

#### GET /monitors/status/stats (NUEVO)
Endpoint para obtener estadísticas de cámaras offline:

```json
{
  "ok": true,
  "stats": {
    "total": 34,
    "online": 0,
    "offline": 34,
    "offlineByType": {
      "timeout": 19,
      "no_route": 4,
      "tcp_timeout": 3,
      "unknown": 8
    }
  },
  "offlineCameras": [
    {
      "cameraId": "D44WWLcXY5",
      "name": "CAM-TOKIO-05",
      "errorMessage": "Sin ruta al host - Verifique la red",
      "errorType": "no_route",
      "lastErrorTime": "2025-10-31T14:39:02.000Z"
    },
    // ... más cámaras offline
  ]
}
```

### 3. Mensajes de Error en Español

Los mensajes son claros y orientados al usuario:

| Tipo de Error | Mensaje |
|---------------|---------|
| `timeout` | Tiempo de espera agotado - La cámara no responde |
| `no_route` | Sin ruta al host - Verifique la red |
| `connection_refused` | Conexión rechazada - La cámara rechazó la conexión |
| `tcp_timeout` | Timeout TCP - Problemas de red |
| `unknown` | Error de conexión |

## Uso en el Frontend

### 1. Mostrar Estado en Lista de Cámaras

```javascript
// Obtener lista de monitores con estado
const response = await fetch('/monitors', {
  headers: {
    'x-group-key': groupKey,
    'x-user-id': userId
  }
});

const { monitors } = await response.json();

// Renderizar con indicador visual
monitors.forEach(monitor => {
  if (!monitor.status.isOnline) {
    // Mostrar badge rojo o icono de error
    // Mostrar tooltip con monitor.status.errorMessage
    console.log(`❌ ${monitor.name}: ${monitor.status.errorMessage}`);
  } else {
    // Mostrar badge verde o icono de OK
    console.log(`✅ ${monitor.name}: Online`);
  }
});
```

### 2. Panel de Estadísticas

```javascript
// Obtener estadísticas de cámaras offline
const response = await fetch('/monitors/status/stats', {
  headers: {
    'x-group-key': groupKey,
    'x-user-id': userId
  }
});

const { stats, offlineCameras } = await response.json();

// Mostrar resumen
console.log(`Total: ${stats.total}`);
console.log(`Online: ${stats.online}`);
console.log(`Offline: ${stats.offline}`);

// Mostrar por tipo de error
Object.entries(stats.offlineByType).forEach(([type, count]) => {
  console.log(`  ${type}: ${count}`);
});

// Listar cámaras con problemas
offlineCameras.forEach(camera => {
  console.log(`${camera.name}: ${camera.errorMessage}`);
});
```

### 3. Sugerencias de UI/UX

#### En la Lista de Cámaras:
- **Badge de estado**: Verde (online) / Rojo (offline)
- **Tooltip**: Mostrar mensaje de error al pasar el mouse
- **Icono**: 🟢 online / 🔴 offline
- **Deshabilitar selección**: No permitir seleccionar cámaras offline
- **Filtro**: Opción para mostrar solo cámaras online

#### Panel de Dashboard:
- **Widget de estadísticas**: Mostrar total online/offline
- **Gráfico**: Distribución de tipos de errores
- **Lista de alertas**: Cámaras que requieren atención
- **Timestamp**: Mostrar cuándo fue el último error

#### Notificaciones:
- **Alert banner**: Si hay muchas cámaras offline
- **Toast notification**: Cuando una cámara pasa de online a offline
- **Email/SMS**: Para errores críticos (opcional)

## Ejemplo de Implementación en React

```jsx
function CameraCard({ monitor }) {
  const { status } = monitor;
  
  return (
    <div className={`camera-card ${!status.isOnline ? 'offline' : ''}`}>
      <div className="camera-header">
        <h3>{monitor.name}</h3>
        <StatusBadge status={status} />
      </div>
      
      {!status.isOnline && (
        <div className="error-message">
          <AlertIcon />
          <span>{status.errorMessage}</span>
          {status.lastErrorTime && (
            <small>
              Último error: {new Date(status.lastErrorTime).toLocaleString()}
            </small>
          )}
        </div>
      )}
      
      <button 
        disabled={!status.isOnline}
        onClick={() => viewCamera(monitor.mid)}
      >
        {status.isOnline ? 'Ver Cámara' : 'No Disponible'}
      </button>
    </div>
  );
}

function StatusBadge({ status }) {
  if (status.isOnline) {
    return <span className="badge badge-success">🟢 Online</span>;
  }
  
  return (
    <Tooltip content={status.errorMessage}>
      <span className="badge badge-danger">🔴 Offline</span>
    </Tooltip>
  );
}
```

## Ventajas de la Solución

1. **No requiere cambios en MediaMTX**: Usa los logs existentes
2. **Tiempo real**: Detecta errores en los últimos 5 minutos
3. **Bajo overhead**: Solo lee las últimas 500 líneas del log
4. **Mensajes claros**: Errores traducidos y explicados en español
5. **Flexible**: Fácil agregar nuevos tipos de errores
6. **Estadísticas**: Permite análisis de problemas recurrentes

## Logs de MediaMTX

**Ubicación:** `/home/camaras-area54/mediamtx.log`

**Formato de errores:**
```
2025/10/31 11:10:34 ERR [path sAATyNPneM] [RTSP source] dial tcp 192.168.30.202:554: i/o timeout
2025/10/31 11:10:36 ERR [path D44WWLcXY5] [RTSP source] dial tcp 192.168.21.16:554: connect: no route to host
2025/10/31 11:10:43 ERR [path QlepLpxzl9] [RTSP source] TCP timeout
```

## Comandos Útiles

### Ver cámaras offline en tiempo real
```bash
tail -f /home/camaras-area54/mediamtx.log | grep ERR
```

### Contar errores por tipo
```bash
tail -500 /home/camaras-area54/mediamtx.log | grep ERR | grep -o "i/o timeout\|no route\|TCP timeout\|connection refused" | sort | uniq -c
```

### Probar endpoints
```bash
# Obtener lista de monitores con estado
curl -s http://localhost:4000/monitors \
  -H "x-group-key: 63aaObjyC9" \
  -H "x-user-id: quhfjPg7WA" | jq '.monitors[] | {mid, name, status}'

# Obtener estadísticas
curl -s http://localhost:4000/monitors/status/stats \
  -H "x-group-key: 63aaObjyC9" \
  -H "x-user-id: quhfjPg7WA" | jq '.'
```

## Próximos Pasos (Opcionales)

1. **Cache**: Implementar cache de 30 segundos para evitar leer el log en cada request
2. **WebSocket**: Notificaciones en tiempo real cuando una cámara cambia de estado
3. **Historial**: Guardar historial de errores en base de datos
4. **Alertas**: Sistema de notificaciones por email/SMS
5. **Dashboard**: Panel administrativo con gráficos de disponibilidad
6. **Auto-recovery**: Intentar reconectar cámaras automáticamente

## Estado Final

✅ Servicio de análisis de logs implementado
✅ Endpoint GET /monitors incluye estado de cámaras
✅ Endpoint GET /monitors/status/stats para estadísticas
✅ Mensajes de error en español
✅ Detección de 5 tipos de errores diferentes
✅ Probado y funcionando correctamente

**34 cámaras detectadas, 34 offline** (según logs actuales)
- 19 con timeout
- 4 sin ruta al host
- 3 con TCP timeout
- 8 con errores desconocidos
