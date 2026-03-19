import { EventEmitter } from 'node:events';
import { isTimeWithinSchedule } from './camera-settings';
import type { CameraScheduleSettings } from './camera-settings';
import { sendMotionNotification, type MotionNotificationPayload } from './motion-email';
import { MotionEventQueue } from './motion/queue';
import type { MotionEvent } from './motion/types';
import { fetchMonitorByGroupAndId } from './motion/monitors';
import { detectMotionWithFFmpeg } from './motion/detector';
import { detectMotionWithOpenCV } from './motion/detector-opencv';
import { startMotionRecording } from './motion/recording-trigger';

const concurrency = Number(process.env.MOTION_WORKER_CONCURRENCY ?? 3);

export class MotionWorker extends EventEmitter {
  private queue: MotionEventQueue;

  constructor(queue: MotionEventQueue) {
    super();
    this.queue = queue;
  }

  start(): void {
    this.queue.process(async (event: MotionEvent) => {
      await this.handleEvent(event);
    }, concurrency);
  }

  private async handleEvent(event: MotionEvent): Promise<void> {
    try {
      console.log(`[motion-worker] 🔍 Procesando evento de ${event.groupKey}/${event.cameraId} (source: ${event.source})`);
      
      const monitor = await fetchMonitorByGroupAndId(event.groupKey, event.cameraId);
      if (!monitor) {
        this.emit('warning', `Monitor ${event.groupKey}/${event.cameraId} no encontrado`);
        return;
      }
      
      console.log(`[motion-worker] ✅ Monitor encontrado: ${monitor.name}`);

      const settings: CameraScheduleSettings = monitor.settings;
      if (!settings.motionEnabled) {
        this.emit('skip', { reason: 'motion_disabled', event });
        return;
      }

      if (!settings.notifyEmail) {
        this.emit('skip', { reason: 'email_disabled', event });
        return;
      }

      // CRÍTICO: Solo procesar si estamos FUERA del horario de grabación
      // Dentro del horario, la cámara graba continuamente y no necesita detección
      const isWithinSchedule = isTimeWithinSchedule(event.timestamp, settings);
      if (isWithinSchedule) {
        this.emit('skip', { reason: 'within_recording_schedule', event });
        return;
      }

      // Usar OpenCV MOG2 para detección profesional de movimiento
      // Variable de entorno para elegir detector: 'opencv' (default) o 'ffmpeg'
      const detectorType = process.env.MOTION_DETECTOR_TYPE || 'opencv';
      
      // IMPORTANTE: OpenCV no puede procesar HLS, necesita RTSP
      // FFmpeg puede usar HLS o RTSP
      const streamUrl = detectorType === 'opencv' 
        ? monitor.rtspUrl  // OpenCV requiere RTSP
        : (monitor.hlsUrl || monitor.rtspUrl);  // FFmpeg puede usar HLS
      
      const detectionResult = detectorType === 'opencv'
        ? await detectMotionWithOpenCV({
            rtspUrl: streamUrl,
            sensitivity: settings.motionSensitivity,
          })
        : await detectMotionWithFFmpeg({
            rtspUrl: streamUrl,
            sensitivity: settings.motionSensitivity,
          });

      if (!detectionResult.motionDetected) {
        const reason = detectorType === 'opencv' ? 'opencv_no_motion' : 'ffmpeg_no_motion';
        this.emit('skip', { reason, event });
        return;
      }
      
      console.log(`[motion-worker] 🎯 MOVIMIENTO DETECTADO con ${detectorType.toUpperCase()}`);
      if (detectionResult.motionFrames && detectionResult.totalFrames) {
        console.log(`[motion-worker] 📊 Frames con movimiento: ${detectionResult.motionFrames}/${detectionResult.totalFrames}`);
      }

      const payload: MotionNotificationPayload = {
        cameraId: event.cameraId,
        cameraName: monitor.name,
        timestamp: event.timestamp,
        extraData: {
          event_source: event.source,
        },
      };

      if (event.snapshotUrl) {
        payload.snapshotUrl = event.snapshotUrl;
      }
      if (event.clipUrl) {
        payload.clipUrl = event.clipUrl;
      }
      if (detectionResult.snapshotPath && detectionResult.snapshotFilename) {
        payload.attachments = [
          {
            filename: detectionResult.snapshotFilename,
            path: detectionResult.snapshotPath,
          },
        ];
        payload.snapshotUrl ??= detectionResult.snapshotPath;
      }

      const result = await sendMotionNotification(payload);
      
      if (result.status === 'sent') {
        console.log(`[motion-worker] ✅ Correo enviado exitosamente para ${monitor.name}`);
      } else {
        console.log(`[motion-worker] ⚠️  Correo NO enviado para ${monitor.name}: ${result.reason || 'desconocido'}`);
      }
      
      // Iniciar grabación automática por movimiento
      const recordingDuration = Number(process.env.MOTION_RECORDING_DURATION ?? 5);
      const recordingResult = await startMotionRecording(
        event.cameraId,
        monitor.groupKey,
        recordingDuration
      );
      
      if (recordingResult.success) {
        console.log(`[motion-worker] 🎬 ${recordingResult.message} para ${monitor.name}`);
      } else {
        console.log(`[motion-worker] ⚠️  Error iniciando grabación: ${recordingResult.message}`);
      }
      
      this.emit('processed', { event, result });
    } catch (error) {
      this.emit('error', error);
    }
  }
}
