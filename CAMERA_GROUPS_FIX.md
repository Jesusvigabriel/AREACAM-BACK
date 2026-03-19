# Fix del Endpoint de Grupos de Cámaras

## Fecha: 31 de Octubre 2025

## Problemas Encontrados

### 1. Error 400 Bad Request - ID demasiado largo
**Error:** `Data too long for column 'id' at row 1`

**Causa:** El ID generado era demasiado largo para la columna `VARCHAR(20)` en la base de datos.
- Formato anterior: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
- Longitud: ~30 caracteres

**Solución:** Acortar el ID usando base36 para el timestamp
```typescript
const timestamp = Date.now().toString(36); // Timestamp en base36 (más corto)
const random = Math.random().toString(36).substr(2, 6); // 6 caracteres aleatorios
const id = `g_${timestamp}_${random}`; // Formato: g_timestamp_random (~18 caracteres)
```

### 2. Error 500 en GET - JSON parsing error
**Error:** `SyntaxError: Unexpected end of JSON input`

**Causa:** MySQL devuelve campos JSON de diferentes formas:
- Como array ya parseado (cuando el driver lo detecta como JSON)
- Como string (en algunos casos)
- Como string vacío (en registros antiguos)

**Solución:** Manejo robusto de múltiples formatos
```typescript
const groups = rows.map(row => {
  let cameraIds = [];
  try {
    // MySQL devuelve JSON como objeto ya parseado o como string
    if (Array.isArray(row.camera_ids)) {
      cameraIds = row.camera_ids;
    } else if (typeof row.camera_ids === 'string') {
      cameraIds = row.camera_ids && row.camera_ids.trim() !== '' ? JSON.parse(row.camera_ids) : [];
    } else if (row.camera_ids) {
      cameraIds = row.camera_ids;
    }
  } catch (e) {
    console.warn(`[camera-groups] Error parsing camera_ids for group ${row.id}:`, e);
    cameraIds = [];
  }
  
  return {
    id: row.id,
    userId: row.user_id,
    groupKey: row.group_key,
    name: row.name,
    cameraIds,
    gridSize: row.grid_size,
    isDefault: Boolean(row.is_default),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
});
```

### 3. Logging mejorado
Se agregó logging detallado para facilitar el debugging:
```typescript
console.log('[camera-groups] POST request body:', JSON.stringify(req.body, null, 2));

if (!parsed.success) {
  console.error('[camera-groups] Validation error:', JSON.stringify(parsed.error.flatten(), null, 2));
  // ...
}
```

## Validaciones Implementadas

El esquema de validación con Zod:
```typescript
const cameraGroupSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(100),
  cameraIds: z.array(z.string()).max(6, 'Máximo 6 cámaras por grupo'),
  gridSize: z.number().int().min(1).max(6).optional().default(4),
  isDefault: z.boolean().optional().default(false),
});
```

## Pruebas Realizadas

### POST /camera-groups
✅ Crear grupo con todos los campos
✅ Crear grupo sin campos opcionales
✅ Validación: más de 6 cámaras (rechazado correctamente)
✅ Validación: sin nombre (rechazado correctamente)
✅ IDs de cámaras se guardan correctamente

### GET /camera-groups
✅ Listar todos los grupos del usuario
✅ Parseo correcto de camera_ids en formato JSON
✅ Manejo de registros con camera_ids vacío
✅ Ordenamiento por is_default DESC, name ASC

## Servicios Levantados

- ✅ **Backend**: Puerto 4000 (nodemon en modo dev)
- ✅ **MediaMTX**: Procesando streams RTSP

## Archivos Modificados

1. `/home/camaras-area54/AREACAM/areacam/backend/src/routes/camera-groups.ts`
   - Líneas 40-60: Manejo robusto de JSON en GET
   - Líneas 72-89: Logging mejorado y generación de ID corto en POST

## Comandos Útiles

### Probar el endpoint
```bash
# Obtener credenciales
curl http://localhost:4000/debug/credentials | jq '.'

# Crear grupo
curl -X POST http://localhost:4000/camera-groups \
  -H "Content-Type: application/json" \
  -H "x-group-key: 63aaObjyC9" \
  -H "x-user-id: quhfjPg7WA" \
  -d '{
    "name": "Mi Grupo",
    "cameraIds": ["cam1", "cam2"],
    "gridSize": 4,
    "isDefault": false
  }' | jq '.'

# Listar grupos
curl http://localhost:4000/camera-groups \
  -H "x-group-key: 63aaObjyC9" \
  -H "x-user-id: quhfjPg7WA" | jq '.'
```

### Verificar en base de datos
```bash
sudo mysql -e "USE ccio; SELECT id, name, camera_ids FROM CameraGroups;"
```

## Estado Final

✅ Endpoint POST /camera-groups funcionando correctamente
✅ Endpoint GET /camera-groups funcionando correctamente
✅ Validaciones Zod funcionando
✅ IDs de cámaras se guardan y recuperan correctamente
✅ Logging detallado para debugging
