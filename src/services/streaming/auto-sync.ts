/**
 * Sincronización automática periódica de MediaMTX
 * 
 * Este servicio sincroniza automáticamente la configuración de MediaMTX
 * cada cierto tiempo para:
 * 1. Detectar cambios de horario (dentro/fuera de grabación)
 * 2. Aplicar cambios en la configuración de cámaras
 * 3. Mantener MediaMTX actualizado sin reiniciar
 */

import { syncCamerasToMediaMTX } from './stream-manager';

// Intervalo de sincronización en minutos (default: 5 minutos)
const SYNC_INTERVAL_MINUTES = Number(process.env.MEDIAMTX_SYNC_INTERVAL ?? 5);

let syncIntervalId: NodeJS.Timeout | null = null;

/**
 * Inicia la sincronización automática periódica
 */
export function startAutoSync(): void {
  if (syncIntervalId) {
    console.log('[auto-sync] ⚠️  Sincronización automática ya está activa');
    return;
  }

  console.log(`[auto-sync] 🔄 Iniciando sincronización automática cada ${SYNC_INTERVAL_MINUTES} minutos`);

  // Sincronización periódica
  syncIntervalId = setInterval(async () => {
    try {
      console.log('[auto-sync] 🔄 Ejecutando sincronización automática...');
      const result = await syncCamerasToMediaMTX();
      
      if (result.success) {
        console.log(`[auto-sync] ✅ Sincronización completada: ${result.camerasConfigured} cámaras`);
        if (result.errors.length > 0) {
          console.warn(`[auto-sync] ⚠️  ${result.errors.length} errores durante sincronización`);
        }
      } else {
        console.error(`[auto-sync] ❌ Error en sincronización`);
      }
    } catch (error) {
      console.error('[auto-sync] ❌ Error ejecutando sincronización:', error);
    }
  }, SYNC_INTERVAL_MINUTES * 60 * 1000);

  console.log('[auto-sync] ✅ Sincronización automática iniciada');
}

/**
 * Detiene la sincronización automática
 */
export function stopAutoSync(): void {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
    console.log('[auto-sync] ⏹️  Sincronización automática detenida');
  }
}

/**
 * Verifica si la sincronización automática está activa
 */
export function isAutoSyncActive(): boolean {
  return syncIntervalId !== null;
}
