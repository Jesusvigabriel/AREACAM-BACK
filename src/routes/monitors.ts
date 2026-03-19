import { Router } from 'express';
import { z } from 'zod';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import pool from '../db';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/roles';
import { applyCameraUrl, generateDefaultMonitor } from '../utils/monitorDefaults';
import {
  DEFAULT_CAMERA_SETTINGS,
  normalizeCameraSettings,
  readCameraSettingsFromDetails,
  writeCameraSettingsToDetails,
  WEEK_DAYS,
  type DayOfWeek,
  type PartialCameraScheduleSettings,
  type CameraScheduleSettings,
} from '../services/camera-settings';
import { getStreamUrls } from '../services/streaming/stream-manager';

const router = Router();

const MONITOR_COLUMNS =
  'mid, ke, name, type, protocol, host, port, path, mode, ext, fps, width, height, details';

const timeRegex = /^(?:[01]?\d|2[0-3]):[0-5]\d$/;

const booleanLikeSchema = z.preprocess((value) => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'off'].includes(normalized)) {
      return false;
    }
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  return value;
}, z.boolean());

const numberLikeSchema = z.preprocess((value) => {
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return value;
}, z.number().int().min(0).max(100));

const dailyScheduleSchema = z.object({
  recordStart: z.union([z.string().regex(timeRegex, 'Horario inválido'), z.null()]).optional(),
  recordEnd: z.union([z.string().regex(timeRegex, 'Horario inválido'), z.null()]).optional(),
});

const scheduleShape: Record<DayOfWeek, z.ZodTypeAny> = WEEK_DAYS.reduce(
  (shape, day) => {
    shape[day] = dailyScheduleSchema.optional();
    return shape;
  },
  {} as Record<DayOfWeek, z.ZodTypeAny>,
);

const scheduleSchema = z.object(scheduleShape).partial().optional();

const baseCameraSettingsSchema = z.object({
  schedule: scheduleSchema,
  motionEnabled: booleanLikeSchema.optional(),
  notifyEmail: booleanLikeSchema.optional(),
  motionSensitivity: numberLikeSchema.optional(),
});

const updateCameraSettingsSchema = baseCameraSettingsSchema.refine(
  (data) => Object.values(data).some((value) => value !== undefined),
  { message: 'Debe enviar al menos un campo de configuración' }
);

// Obtener configuración de horario/detección de una cámara
router.get('/:mid/settings', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const groupKey = req.user?.ke;
    const { mid } = req.params;

    if (!groupKey || !mid) {
      return res.status(400).json({ ok: false, message: 'Parámetros inválidos' });
    }

    const ownership = await assertMonitorOwnership(groupKey, mid);
    if (!ownership.monitor) {
      return res.status(ownership.error!.status).json({ ok: false, message: ownership.error!.message });
    }

    return res.json({ ok: true, settings: ownership.monitor.settings });
  } catch (error) {
    console.error('[monitors] Error obteniendo configuración:', error);
    return res.status(500).json({ ok: false, message: 'Error al obtener configuración' });
  }
});

// Actualizar configuración de horario/detección de una cámara
router.patch('/:mid/settings', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const groupKey = req.user?.ke;
    const { mid } = req.params;

    if (!groupKey || !mid) {
      return res.status(400).json({ ok: false, message: 'Parámetros inválidos' });
    }

    const parsed = updateCameraSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, message: 'Datos inválidos', errors: parsed.error.flatten() });
    }

    const ownership = await assertMonitorOwnership(groupKey, mid);
    if (!ownership.monitor) {
      return res.status(ownership.error!.status).json({ ok: false, message: ownership.error!.message });
    }

    const currentSettings = ownership.monitor.settings ?? DEFAULT_CAMERA_SETTINGS;
    const payload: PartialCameraScheduleSettings = {};

    if (parsed.data.schedule !== undefined) {
      payload.schedule = parsed.data.schedule;
    }
    if (parsed.data.motionEnabled !== undefined) {
      payload.motionEnabled = parsed.data.motionEnabled;
    }
    if (parsed.data.notifyEmail !== undefined) {
      payload.notifyEmail = parsed.data.notifyEmail;
    }
    if (parsed.data.motionSensitivity !== undefined) {
      payload.motionSensitivity = parsed.data.motionSensitivity;
    }

    const normalized = normalizeCameraSettings(payload, currentSettings);

    const rawDetails = ownership.monitor.details ?? {};
    const updatedDetails = writeCameraSettingsToDetails(rawDetails, normalized);

    await pool.execute(
      'UPDATE Monitors SET details = ? WHERE ke = ? AND mid = ?',
      [JSON.stringify(updatedDetails), groupKey, mid]
    );

    return res.json({ ok: true, settings: normalized });
  } catch (error) {
    console.error('[monitors] Error actualizando configuración:', error);
    return res.status(500).json({ ok: false, message: 'Error al actualizar configuración' });
  }
});
function parseMonitorDetails(details: unknown): Record<string, unknown> | null {
  if (!details) {
    return null;
  }

  if (typeof details === 'string') {
    try {
      const parsed = JSON.parse(details);
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, unknown>;
      }
    } catch (error) {
      console.warn('[monitors] no se pudo parsear detalles', error);
      return null;
    }
    return null;
  }

  if (typeof details === 'object') {
    return { ...(details as Record<string, unknown>) };
  }

  return null;
}

interface MonitorResponse {
  mid: string;
  ke: string;
  name: string;
  type: string;
  protocol: string;
  host: string;
  port: string | null;
  path: string;
  mode: string | null;
  ext: string;
  fps: string | null;
  width: string | null;
  height: string | null;
  details: Record<string, unknown> | null;
  rtspUrl?: string;
  settings: CameraScheduleSettings;
  status?: {
    isOnline: boolean;
    errorMessage?: string;
    lastErrorTime?: Date;
  };
  streams?: {
    hls: string;
    webrtc: string;
    rtsp: string;
  };
}

async function assertMonitorOwnership(
  groupKey: string,
  mid: string,
): Promise<{ monitor: MonitorResponse; error?: never } | { monitor?: never; error: { status: number; message: string } }> {
  if (!mid) {
    return { error: { status: 400, message: 'Falta el identificador del monitor' } };
  }

  const monitor = await fetchMonitorForGroup(groupKey, mid);

  if (!monitor) {
    return { error: { status: 404, message: 'Monitor no encontrado' } };
  }

  return { monitor };
}

async function parseMonitorRow(row: RowDataPacket): Promise<MonitorResponse> {
  const monitorId = String(row.mid ?? '');

  // Construir URL RTSP completa con credenciales
  const details = parseMonitorDetails(row.details);
  const settings = readCameraSettingsFromDetails(details);
  const protocol = String(row.protocol ?? 'rtsp');
  const host = String(row.host ?? '');
  const port = row.port !== undefined && row.port !== null ? String(row.port) : '554';
  const path = String(row.path ?? '/');
  
  let rtspUrl = `${protocol}://`;
  if (details?.muser && details?.mpass) {
    rtspUrl += `${details.muser}:${details.mpass}@`;
  }
  rtspUrl += `${host}:${port}${path}`;

  // Obtener URLs de streaming de MediaMTX
  const streams = getStreamUrls(monitorId);

  return {
    mid: String(row.mid ?? ''),
    ke: String(row.ke ?? ''),
    name: String(row.name ?? ''),
    type: String(row.type ?? ''),
    protocol,
    host,
    port,
    path,
    mode: row.mode !== undefined && row.mode !== null ? String(row.mode) : null,
    ext: String(row.ext ?? ''),
    fps: row.fps !== undefined && row.fps !== null ? String(row.fps) : null,
    width: row.width !== undefined && row.width !== null ? String(row.width) : null,
    height: row.height !== undefined && row.height !== null ? String(row.height) : null,
    details,
    rtspUrl,
    settings,
    streams,
  };
}

async function fetchMonitorForGroup(groupKey: string, mid: string): Promise<MonitorResponse | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT ${MONITOR_COLUMNS} FROM Monitors WHERE ke = ? AND mid = ? LIMIT 1`,
    [groupKey, mid],
  );

  if (!rows.length) {
    return null;
  }

  const [row] = rows;

  if (!row) {
    return null;
  }

  return await parseMonitorRow(row);
}

const cameraUrlSchema = z
  .string()
  .url({ message: 'URL de cámara inválida' })
  .refine((value) => value.startsWith('rtsp://'), { message: 'Solo se acepta RTSP por ahora.' });

const createMonitorSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  rtspUrl: cameraUrlSchema,
  groupKey: z.string().min(1, 'Falta el grupo (ke)').optional(),
  saveDir: z.string().optional(),
  mode: z.enum(['start', 'record', 'stop']).optional(),
  streamQuality: z.string().optional(),
});

const updateMonitorSchema = z
  .object({
    name: z.string().min(1, 'El nombre es obligatorio').optional(),
    rtspUrl: cameraUrlSchema.optional(),
    saveDir: z.string().optional(),
    mode: z.enum(['start', 'record', 'stop']).optional(),
    streamQuality: z.string().optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Debe enviar al menos un campo para actualizar',
  });

router.use(requireAuth);

router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const groupKey = req.user?.ke;
    const userRole = req.user?.role ?? 'operario';
    const rawDetails = req.user?.details;

    if (!groupKey) {
      return res.status(400).json({ ok: false, message: 'Falta el grupo' });
    }

    const userDetails =
      rawDetails && typeof rawDetails === 'object'
        ? (rawDetails as Record<string, unknown>)
        : {};

    const allowAll =
      userRole === 'admin' || String(userDetails.allmonitors ?? '') === '1';

    const assignedMonitors = Array.isArray(userDetails.monitors)
      ? (userDetails.monitors as unknown[]).map((mid) => String(mid))
      : [];

    if (!allowAll && assignedMonitors.length === 0) {
      return res.json({ ok: true, monitors: [] });
    }

    let query = `SELECT ${MONITOR_COLUMNS} FROM Monitors WHERE ke = ?`;
    const params: string[] = [groupKey];

    if (!allowAll) {
      const placeholders = assignedMonitors.map(() => '?').join(',');
      query += ` AND mid IN (${placeholders})`;
      params.push(...assignedMonitors);
    }

    query += ' ORDER BY name ASC';

    const [rows] = await pool.execute<RowDataPacket[]>(query, params);

    const monitors = await Promise.all(
      rows.map(async (row) => {
        const monitor = await parseMonitorRow(row);
        return monitor;
      }),
    );

    return res.json({ ok: true, monitors });
  } catch (error) {
    console.error('[monitors] error listando', error);
    return res.status(500).json({ ok: false, message: 'Error al listar monitores' });
  }
});

// Obtener lista ligera de monitores activos (para selección)
router.get('/active', async (req: AuthenticatedRequest, res) => {
  try {
    const groupKey = req.user?.ke;

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT mid, name, type, host, port FROM Monitors WHERE ke = ? ORDER BY name`,
      [groupKey]
    );

    const monitors = rows.map(row => ({
      mid: String(row.mid ?? ''),
      name: String(row.name ?? ''),
      type: String(row.type ?? ''),
      host: String(row.host ?? ''),
      port: row.port !== undefined && row.port !== null ? String(row.port) : null,
    }));

    res.json({
      ok: true,
      data: monitors
    });
  } catch (error) {
    console.error('[monitors] Error obteniendo monitores activos:', error);
    res.status(500).json({
      ok: false,
      message: 'Error interno del servidor'
    });
  }
});

// Obtener streams de un monitor específico
router.get('/:mid/streams', async (req: AuthenticatedRequest, res) => {
  try {
    const { mid } = req.params;
    const groupKey = req.user?.ke;

    if (!groupKey) {
      return res.status(401).json({ ok: false, message: 'Sesión no válida' });
    }

    if (!mid) {
      return res.status(400).json({ ok: false, message: 'Falta el identificador del monitor' });
    }

    const ownership = await assertMonitorOwnership(groupKey, mid);
    if (!ownership.monitor) {
      return res.status(ownership.error!.status).json({
        ok: false,
        message: ownership.error!.message
      });
    }

    const monitor = ownership.monitor;

    res.json({
      ok: true,
      data: {
        mid: monitor.mid,
        name: monitor.name,
        rtspUrl: monitor.rtspUrl,
        streams: monitor.streams
      }
    });
  } catch (error) {
    console.error('[monitors] Error obteniendo streams:', error);
    res.status(500).json({
      ok: false,
      message: 'Error interno del servidor'
    });
  }
});

// Crear nueva cámara (solo admin)
router.post('/', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const groupKey = req.user?.ke;
    
    if (!groupKey) {
      return res.status(401).json({ ok: false, message: 'Sesión no válida' });
    }

    const parsed = createMonitorSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: 'Datos inválidos',
        errors: parsed.error.flatten(),
      });
    }

    const { name, rtspUrl, mode, streamQuality } = parsed.data;

    // Generar monitor con valores por defecto
    const monitor = generateDefaultMonitor(groupKey);
    monitor.name = name;
    monitor.mode = mode || 'start';

    // Aplicar URL RTSP
    const url = new URL(rtspUrl);
    applyCameraUrl(monitor, url);

    // Insertar en base de datos
    await pool.execute(
      `INSERT INTO Monitors (
        mid, ke, name, type, protocol, host, port, path, mode, ext, fps, width, height, details
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        monitor.mid,
        monitor.ke,
        monitor.name,
        monitor.type,
        monitor.protocol,
        monitor.host,
        monitor.port,
        monitor.path,
        monitor.mode,
        monitor.ext,
        monitor.fps,
        monitor.width,
        monitor.height,
        JSON.stringify(monitor.details || {}),
      ]
    );

    return res.json({
      ok: true,
      monitor: {
        mid: monitor.mid,
        name: monitor.name,
        mode: monitor.mode,
      },
    });
  } catch (error) {
    console.error('[monitors] Error creando monitor:', error);
    return res.status(500).json({ ok: false, message: 'Error al crear monitor' });
  }
});

// Actualizar cámara (solo admin)
router.patch('/:mid', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const groupKey = req.user?.ke;
    const { mid } = req.params;

    if (!groupKey || !mid) {
      return res.status(400).json({ ok: false, message: 'Parámetros inválidos' });
    }

    const parsed = updateMonitorSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: 'Datos inválidos',
        errors: parsed.error.flatten(),
      });
    }

    const updates = parsed.data;
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name) {
      fields.push('name = ?');
      values.push(updates.name);
    }

    if (updates.rtspUrl) {
      const tempMonitor = generateDefaultMonitor(groupKey);
      const url = new URL(updates.rtspUrl);
      applyCameraUrl(tempMonitor, url);
      
      fields.push('protocol = ?', 'host = ?', 'port = ?', 'path = ?', 'details = ?');
      values.push(
        tempMonitor.protocol, 
        tempMonitor.host, 
        tempMonitor.port, 
        tempMonitor.path,
        JSON.stringify(tempMonitor.details || {})
      );
    }

    if (updates.mode) {
      fields.push('mode = ?');
      values.push(updates.mode);
    }

    if (fields.length === 0) {
      return res.status(400).json({ ok: false, message: 'No hay campos para actualizar' });
    }

    values.push(groupKey, mid);

    await pool.execute(
      `UPDATE Monitors SET ${fields.join(', ')} WHERE ke = ? AND mid = ?`,
      values
    );

    return res.json({ ok: true, message: 'Monitor actualizado' });
  } catch (error) {
    console.error('[monitors] Error actualizando monitor:', error);
    return res.status(500).json({ ok: false, message: 'Error al actualizar monitor' });
  }
});

// Eliminar cámara (solo admin)
router.delete('/:mid', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const groupKey = req.user?.ke;
    const { mid } = req.params;

    if (!groupKey || !mid) {
      return res.status(400).json({ ok: false, message: 'Parámetros inválidos' });
    }

    await pool.execute(
      'DELETE FROM Monitors WHERE ke = ? AND mid = ?',
      [groupKey, mid]
    );

    return res.json({ ok: true, message: 'Monitor eliminado' });
  } catch (error) {
    console.error('[monitors] Error eliminando monitor:', error);
    return res.status(500).json({ ok: false, message: 'Error al eliminar monitor' });
  }
});

// Importar cámaras desde JSON (solo admin)
router.post('/import', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const groupKey = req.user?.ke;
    const { cameras } = req.body;

    if (!groupKey) {
      return res.status(401).json({ ok: false, message: 'Sesión no válida' });
    }

    if (!cameras || !Array.isArray(cameras)) {
      return res.status(400).json({ ok: false, message: 'Formato inválido. Se espera un array de cámaras' });
    }

    const imported = [];
    const errors = [];

    for (const camera of cameras) {
      try {
        const { name, rtspUrl, mode, streamQuality } = camera;

        if (!name || !rtspUrl) {
          errors.push({ camera: name || 'sin nombre', error: 'Faltan campos requeridos' });
          continue;
        }

        // Generar monitor con valores por defecto
        const monitor = generateDefaultMonitor(groupKey);
        monitor.name = name;
        monitor.mode = mode || 'start';

        // Aplicar URL RTSP
        applyCameraUrl(monitor, rtspUrl);

        // Insertar en base de datos
        await pool.execute(
          `INSERT INTO Monitors (
            mid, ke, name, type, protocol, host, port, path, mode, ext, fps, width, height, details
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            monitor.mid,
            monitor.ke,
            monitor.name,
            monitor.type,
            monitor.protocol,
            monitor.host,
            monitor.port,
            monitor.path,
            monitor.mode,
            monitor.ext,
            monitor.fps,
            monitor.width,
            monitor.height,
            JSON.stringify(monitor.details || {}),
          ]
        );

        imported.push({ mid: monitor.mid, name: monitor.name });
      } catch (error) {
        errors.push({ 
          camera: camera.name || 'desconocido', 
          error: error instanceof Error ? error.message : 'Error desconocido' 
        });
      }
    }

    return res.json({
      ok: true,
      message: `Importadas ${imported.length} de ${cameras.length} cámaras`,
      imported,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('[monitors] Error importando cámaras:', error);
    return res.status(500).json({ ok: false, message: 'Error al importar cámaras' });
  }
});

export default router;
