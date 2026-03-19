import { Router } from 'express';
import { z } from 'zod';
import { enqueueMotionEvent, getAutoMonitorStatus } from '../services/motion';
import { fetchMonitorByGroupAndId } from '../services/motion/monitors';

const router = Router();

const triggerSchema = z.object({
  camera: z.string().min(1, 'Se requiere el identificador de la cámara'),
  groupKey: z.string().min(1).optional(),
  source: z.string().min(1).optional(),
  timestamp: z.union([z.string(), z.number()]).optional(),
  snapshotUrl: z.string().url().optional(),
  clipUrl: z.string().url().optional(),
  payload: z.record(z.unknown()).optional(),
});

function parseTimestamp(value: string | number | undefined): Date | undefined {
  if (value === undefined) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

router.post('/trigger', async (req, res) => {
  try {
    const expectedToken = process.env.MOTION_EVENTS_TOKEN;
    if (expectedToken) {
      const provided = req.header('X-Motion-Token');
      if (!provided || provided !== expectedToken) {
        return res.status(401).json({ ok: false, message: 'Token inválido' });
      }
    }

    const parsed = triggerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, message: 'Datos inválidos', errors: parsed.error.flatten() });
    }

    const data = parsed.data;
    const timestamp = parseTimestamp(data.timestamp);

    const monitor = await fetchMonitorByGroupAndId(data.groupKey, data.camera);
    if (!monitor) {
      return res.status(404).json({ ok: false, message: 'Cámara no encontrada' });
    }

    const eventOptions: {
      cameraId: string;
      groupKey: string;
      source: string;
      timestamp?: Date;
      snapshotUrl?: string;
      clipUrl?: string;
      payload?: Record<string, unknown>;
    } = {
      cameraId: monitor.mid,
      groupKey: monitor.groupKey,
      source: data.source ?? 'stream',
    };

    if (timestamp) {
      eventOptions.timestamp = timestamp;
    }
    if (data.snapshotUrl) {
      eventOptions.snapshotUrl = data.snapshotUrl;
    }
    if (data.clipUrl) {
      eventOptions.clipUrl = data.clipUrl;
    }
    if (data.payload) {
      eventOptions.payload = data.payload;
    }

    console.log(`[motion-events] 📨 Disparando evento para ${monitor.name} (${monitor.mid})`);
    enqueueMotionEvent(eventOptions);

    return res.status(202).json({ ok: true, message: 'Evento encolado' });
  } catch (error) {
    console.error('[motion-events] Error en trigger:', error);
    return res.status(500).json({ ok: false, message: 'Error interno procesando evento' });
  }
});

// Obtener estado del monitor automático
router.get('/auto-monitor/status', (req, res) => {
  const status = getAutoMonitorStatus();
  
  if (!status) {
    return res.json({
      ok: true,
      enabled: false,
      message: 'Monitor automático no está activo',
    });
  }

  return res.json({
    ok: true,
    enabled: true,
    active: status.active,
    intervalSeconds: status.intervalSeconds,
  });
});

export default router;
