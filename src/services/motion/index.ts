import { MotionEventQueue } from './queue';
import type { MotionEvent, MotionEventSource } from './types';
import { MotionWorker } from '../motion-worker';
import { MotionAutoMonitor } from './auto-monitor';

let queue: MotionEventQueue | null = null;
let worker: MotionWorker | null = null;
let autoMonitor: MotionAutoMonitor | null = null;
let initialized = false;

interface EnqueueMotionEventOptions {
  cameraId: string;
  groupKey?: string;
  source?: MotionEventSource;
  timestamp?: Date;
  snapshotUrl?: string;
  clipUrl?: string;
  payload?: Record<string, unknown>;
}

export function initMotionProcessing(): void {
  if (initialized) {
    return;
  }

  queue = new MotionEventQueue();
  worker = new MotionWorker(queue);

  worker.on('processed', ({ event, result }) => {
    console.log(
      `[motion-worker] Notificación enviada para ${event.groupKey ?? 'default'}:${event.cameraId} (status=${result.status})`,
    );
  });

  worker.on('skip', ({ reason, event }) => {
    console.log(
      `[motion-worker] Evento descartado (${reason}) para ${event.groupKey ?? 'default'}:${event.cameraId}`,
    );
  });

  worker.on('warning', (message) => {
    console.warn('[motion-worker]', message);
  });

  worker.on('error', (error) => {
    console.error('[motion-worker] Error procesando evento:', error);
  });

  worker.start();

  // Inicializar monitor automático
  const autoMonitorEnabled = process.env.MOTION_AUTO_MONITOR_ENABLED !== 'false';
  const autoMonitorInterval = Number(process.env.MOTION_AUTO_MONITOR_INTERVAL ?? 30);

  if (autoMonitorEnabled) {
    autoMonitor = new MotionAutoMonitor({
      intervalSeconds: autoMonitorInterval,
      enabled: true,
    });

    autoMonitor.on('started', () => {
      console.log('[motion-auto-monitor] Monitor automático iniciado');
    });

    autoMonitor.on('check-completed', ({ checkedCount, triggeredCount }) => {
      if (checkedCount > 0) {
        console.log(
          `[motion-auto-monitor] Chequeo completado: ${checkedCount} cámaras revisadas, ${triggeredCount} eventos disparados`
        );
      }
    });

    autoMonitor.on('error', (error) => {
      console.error('[motion-auto-monitor] Error:', error);
    });

    autoMonitor.start();
  }

  initialized = true;
  console.log('[motion-worker] Inicializado');
}

export function enqueueMotionEvent(options: EnqueueMotionEventOptions): void {
  if (!initialized || !queue) {
    initMotionProcessing();
  }

  const event: MotionEvent = {
    cameraId: options.cameraId,
    source: options.source ?? 'api',
    timestamp: options.timestamp ?? new Date(),
  };

  if (options.groupKey) {
    event.groupKey = options.groupKey;
  }
  if (options.snapshotUrl) {
    event.snapshotUrl = options.snapshotUrl;
  }
  if (options.clipUrl) {
    event.clipUrl = options.clipUrl;
  }
  if (options.payload) {
    event.payload = options.payload;
  }

  console.log(`[motion] 📥 Encolando evento: ${event.groupKey}/${event.cameraId} (source: ${event.source})`);
  queue!.enqueue(event);
}

export function stopMotionProcessing(): void {
  if (autoMonitor) {
    autoMonitor.stop();
    autoMonitor = null;
  }
  initialized = false;
  console.log('[motion-worker] Detenido');
}

export function getAutoMonitorStatus(): { active: boolean; intervalSeconds: number } | null {
  if (!autoMonitor) {
    return null;
  }
  return {
    active: autoMonitor.isActive(),
    intervalSeconds: autoMonitor.getIntervalSeconds(),
  };
}
