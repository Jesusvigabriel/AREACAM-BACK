import { EventEmitter } from 'node:events';
import pool from '../../db';
import type { RowDataPacket } from 'mysql2/promise';
import { readCameraSettingsFromDetails, isTimeWithinSchedule } from '../camera-settings';
import { enqueueMotionEvent } from './index';

interface MonitorRow extends RowDataPacket {
  mid: string;
  ke: string;
  name: string;
  mode: string;
  protocol: string | null;
  host: string | null;
  port: string | null;
  path: string | null;
  details: string | Record<string, unknown> | null;
}

interface AutoMonitorOptions {
  intervalSeconds?: number;
  enabled?: boolean;
}

/**
 * Monitor automático que revisa periódicamente las cámaras
 * que están fuera de su horario de grabación y tienen
 * detección de movimiento habilitada.
 */
export class MotionAutoMonitor extends EventEmitter {
  private intervalId: NodeJS.Timeout | null = null;
  private intervalSeconds: number;
  private enabled: boolean;
  private isRunning = false;

  constructor(options: AutoMonitorOptions = {}) {
    super();
    this.intervalSeconds = options.intervalSeconds ?? 30;
    this.enabled = options.enabled ?? true;
  }

  start(): void {
    if (this.intervalId || !this.enabled) {
      return;
    }

    console.log(`[motion-auto-monitor] Iniciando monitor automático (intervalo: ${this.intervalSeconds}s)`);
    
    // Primera ejecución inmediata
    this.checkCameras().catch((error) => {
      console.error('[motion-auto-monitor] Error en primera ejecución:', error);
    });

    // Luego ejecutar periódicamente
    this.intervalId = setInterval(() => {
      this.checkCameras().catch((error) => {
        console.error('[motion-auto-monitor] Error en chequeo periódico:', error);
      });
    }, this.intervalSeconds * 1000);

    this.emit('started');
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[motion-auto-monitor] Monitor automático detenido');
      this.emit('stopped');
    }
  }

  private async checkCameras(): Promise<void> {
    if (this.isRunning) {
      console.log('[motion-auto-monitor] Chequeo anterior aún en progreso, saltando...');
      return;
    }

    this.isRunning = true;

    try {
      const now = new Date();
      const cameras = await this.fetchActiveCameras();
      
      let checkedCount = 0;
      let triggeredCount = 0;

      for (const camera of cameras) {
        try {
          const details = this.parseDetails(camera.details);
          const settings = readCameraSettingsFromDetails(details);

          // Solo procesar si tiene detección habilitada
          if (!settings.motionEnabled) {
            continue;
          }

          // Solo procesar si está FUERA del horario de grabación
          const isWithinSchedule = isTimeWithinSchedule(now, settings);
          if (isWithinSchedule) {
            continue;
          }

          checkedCount++;

          // Disparar evento de movimiento para que el worker lo procese
          enqueueMotionEvent({
            cameraId: camera.mid,
            groupKey: camera.ke,
            source: 'auto-monitor',
            timestamp: now,
          });

          triggeredCount++;

          this.emit('camera-checked', {
            cameraId: camera.mid,
            cameraName: camera.name,
            triggered: true,
          });
        } catch (error) {
          console.error(`[motion-auto-monitor] Error procesando cámara ${camera.name}:`, error);
        }
      }

      if (checkedCount > 0) {
        console.log(
          `[motion-auto-monitor] ✅ Revisadas ${checkedCount} cámaras fuera de horario, ${triggeredCount} eventos disparados`
        );
      }

      this.emit('check-completed', { checkedCount, triggeredCount });
    } catch (error) {
      console.error('[motion-auto-monitor] Error en checkCameras:', error);
      this.emit('error', error);
    } finally {
      this.isRunning = false;
    }
  }

  private async fetchActiveCameras(): Promise<MonitorRow[]> {
    const query = `
      SELECT mid, ke, name, mode, protocol, host, port, path, details
      FROM Monitors
      WHERE mode IN ('record', 'start')
      ORDER BY ke, mid
    `;

    const [rows] = await pool.execute<MonitorRow[]>(query);
    return rows;
  }

  private parseDetails(details: unknown): Record<string, unknown> | null {
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
        return null;
      }
      return null;
    }

    if (typeof details === 'object') {
      return { ...(details as Record<string, unknown>) };
    }

    return null;
  }

  isActive(): boolean {
    return this.intervalId !== null;
  }

  getIntervalSeconds(): number {
    return this.intervalSeconds;
  }
}
