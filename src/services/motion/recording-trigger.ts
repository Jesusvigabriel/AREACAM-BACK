/**
 * Servicio para iniciar/detener grabación automática cuando se detecta movimiento
 */

import pool from '../../db';
import type { RowDataPacket } from 'mysql2/promise';
import { syncCamerasToMediaMTX, updateSingleCamera } from '../streaming/stream-manager';

interface RecordingSession {
  cameraId: string;
  startTime: Date;
  timeoutId: NodeJS.Timeout;
}

// Almacenar sesiones de grabación activas
const activeSessions = new Map<string, RecordingSession>();

// Duración de grabación por defecto (en minutos)
const DEFAULT_RECORDING_DURATION = Number(process.env.MOTION_RECORDING_DURATION ?? 5);

/**
 * Inicia grabación para una cámara cuando se detecta movimiento
 */
export async function startMotionRecording(
  cameraId: string,
  groupKey: string,
  durationMinutes: number = DEFAULT_RECORDING_DURATION
): Promise<{ success: boolean; message: string }> {
  try {
    // Verificar si ya hay una sesión activa
    if (activeSessions.has(cameraId)) {
      const session = activeSessions.get(cameraId)!;
      
      // Extender la grabación actual
      clearTimeout(session.timeoutId);
      
      const newTimeout = setTimeout(() => {
        stopMotionRecording(cameraId, groupKey).catch(console.error);
      }, durationMinutes * 60 * 1000);
      
      session.timeoutId = newTimeout;
      session.startTime = new Date();
      
      console.log(`[recording-trigger] ⏱️  Extendiendo grabación de ${cameraId} por ${durationMinutes} minutos más`);
      
      return {
        success: true,
        message: `Grabación extendida por ${durationMinutes} minutos`,
      };
    }

    // Iniciar nueva grabación
    console.log(`[recording-trigger] 🔴 Iniciando grabación de ${cameraId} por ${durationMinutes} minutos`);

    // Cambiar mode a 'record' en la base de datos
    await pool.execute(
      'UPDATE Monitors SET mode = ? WHERE mid = ? AND ke = ?',
      ['record', cameraId, groupKey]
    );

    // Actualizar solo esta cámara en MediaMTX (optimizado)
    console.log(`[recording-trigger] ⚡ Actualizando ${cameraId} en MediaMTX...`);
    await updateSingleCamera(cameraId);

    // Programar detención automática
    const timeoutId = setTimeout(() => {
      stopMotionRecording(cameraId, groupKey).catch(console.error);
    }, durationMinutes * 60 * 1000);

    // Guardar sesión
    activeSessions.set(cameraId, {
      cameraId,
      startTime: new Date(),
      timeoutId,
    });

    return {
      success: true,
      message: `Grabación iniciada por ${durationMinutes} minutos`,
    };
  } catch (error) {
    console.error(`[recording-trigger] Error iniciando grabación de ${cameraId}:`, error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : 'desconocido'}`,
    };
  }
}

/**
 * Detiene grabación de una cámara
 */
export async function stopMotionRecording(
  cameraId: string,
  groupKey: string
): Promise<{ success: boolean; message: string }> {
  try {
    const session = activeSessions.get(cameraId);
    if (!session) {
      return {
        success: false,
        message: 'No hay sesión de grabación activa',
      };
    }

    console.log(`[recording-trigger] ⏹️  Deteniendo grabación de ${cameraId}`);

    // Limpiar timeout
    clearTimeout(session.timeoutId);

    // Cambiar mode a 'start' (streaming sin grabación)
    await pool.execute(
      'UPDATE Monitors SET mode = ? WHERE mid = ? AND ke = ?',
      ['start', cameraId, groupKey]
    );

    // Actualizar solo esta cámara en MediaMTX (optimizado)
    console.log(`[recording-trigger] ⚡ Actualizando ${cameraId} en MediaMTX...`);
    await updateSingleCamera(cameraId);

    // Eliminar sesión
    activeSessions.delete(cameraId);

    const duration = Math.round((Date.now() - session.startTime.getTime()) / 1000 / 60);
    
    return {
      success: true,
      message: `Grabación detenida después de ${duration} minutos`,
    };
  } catch (error) {
    console.error(`[recording-trigger] Error deteniendo grabación de ${cameraId}:`, error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : 'desconocido'}`,
    };
  }
}

/**
 * Obtiene el estado de grabación de una cámara
 */
export function getRecordingStatus(cameraId: string): {
  isRecording: boolean;
  startTime?: Date;
  remainingMinutes?: number;
} {
  const session = activeSessions.get(cameraId);
  
  if (!session) {
    return { isRecording: false };
  }

  const elapsedMs = Date.now() - session.startTime.getTime();
  const remainingMs = (DEFAULT_RECORDING_DURATION * 60 * 1000) - elapsedMs;
  const remainingMinutes = Math.max(0, Math.round(remainingMs / 1000 / 60));

  return {
    isRecording: true,
    startTime: session.startTime,
    remainingMinutes,
  };
}

/**
 * Obtiene todas las sesiones activas
 */
export function getActiveSessions(): Array<{
  cameraId: string;
  startTime: Date;
  remainingMinutes: number;
}> {
  const sessions: Array<{
    cameraId: string;
    startTime: Date;
    remainingMinutes: number;
  }> = [];

  for (const [cameraId, session] of activeSessions.entries()) {
    const status = getRecordingStatus(cameraId);
    if (status.isRecording) {
      sessions.push({
        cameraId,
        startTime: session.startTime,
        remainingMinutes: status.remainingMinutes!,
      });
    }
  }

  return sessions;
}

/**
 * Limpia todas las sesiones (útil para shutdown)
 */
export async function cleanupAllSessions(): Promise<void> {
  console.log(`[recording-trigger] 🧹 Limpiando ${activeSessions.size} sesiones activas`);
  
  for (const [cameraId, session] of activeSessions.entries()) {
    clearTimeout(session.timeoutId);
  }
  
  activeSessions.clear();
}
