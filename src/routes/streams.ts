/**
 * Rutas de Streaming
 * API para gestionar streams de cámaras con MediaMTX
 */

import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/roles';
import { 
  syncCamerasToMediaMTX, 
  getStreamUrls,
  checkMediaMTXStatus 
} from '../services/streaming/stream-manager';
import {
  getCameraHealth,
  getAllCamerasHealth,
  getOfflineCameras,
  getHealthStats
} from '../services/streaming/camera-health';

const router = Router();

router.use(requireAuth);

/**
 * GET /streams/status
 * Verifica el estado de MediaMTX
 */
router.get('/status', async (req: AuthenticatedRequest, res) => {
  try {
    const isRunning = await checkMediaMTXStatus();
    
    return res.json({
      ok: true,
      status: isRunning ? 'running' : 'stopped',
      message: isRunning ? 'MediaMTX está funcionando' : 'MediaMTX no está disponible',
    });
  } catch (error) {
    console.error('[streams] Error verificando estado:', error);
    return res.status(500).json({
      ok: false,
      message: 'Error al verificar estado de MediaMTX',
    });
  }
});

/**
 * GET /streams/:cameraId
 * Obtiene las URLs de streaming para una cámara específica
 */
router.get('/:cameraId', async (req: AuthenticatedRequest, res) => {
  try {
    const { cameraId } = req.params;
    
    if (!cameraId) {
      return res.status(400).json({
        ok: false,
        message: 'ID de cámara requerido',
      });
    }
    
    const urls = getStreamUrls(cameraId);
    
    return res.json({
      ok: true,
      cameraId,
      streams: urls,
    });
  } catch (error) {
    console.error('[streams] Error obteniendo URLs:', error);
    return res.status(500).json({
      ok: false,
      message: 'Error al obtener URLs de streaming',
    });
  }
});

/**
 * POST /streams/sync
 * Sincroniza todas las cámaras activas con MediaMTX
 * Solo admin
 */
router.post('/sync', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    console.log('[streams] Iniciando sincronización manual...');
    
    const result = await syncCamerasToMediaMTX();
    
    if (result.success) {
      return res.json({
        ok: true,
        message: `${result.camerasConfigured} cámaras sincronizadas correctamente`,
        camerasConfigured: result.camerasConfigured,
        errors: result.errors.length > 0 ? result.errors : undefined,
      });
    } else {
      return res.status(500).json({
        ok: false,
        message: 'Error en la sincronización',
        errors: result.errors,
      });
    }
  } catch (error) {
    console.error('[streams] Error en sincronización:', error);
    return res.status(500).json({
      ok: false,
      message: 'Error al sincronizar cámaras',
    });
  }
});

/**
 * POST /streams/reload
 * Recarga la configuración de MediaMTX sin reiniciar
 * Solo admin
 */
router.post('/reload', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    // MediaMTX recarga automáticamente cuando detecta cambios en el archivo
    // Solo necesitamos confirmar que está corriendo
    const isRunning = await checkMediaMTXStatus();
    
    if (!isRunning) {
      return res.status(503).json({
        ok: false,
        message: 'MediaMTX no está corriendo',
      });
    }
    
    return res.json({
      ok: true,
      message: 'MediaMTX recargará la configuración automáticamente',
    });
  } catch (error) {
    console.error('[streams] Error recargando:', error);
    return res.status(500).json({
      ok: false,
      message: 'Error al recargar MediaMTX',
    });
  }
});

/**
 * GET /streams/health
 * Obtiene estadísticas de salud de las cámaras
 */
router.get('/health', async (req: AuthenticatedRequest, res) => {
  try {
    const stats = await getHealthStats();
    const offlineCameras = await getOfflineCameras();
    
    return res.json({
      ok: true,
      stats,
      offlineCameras: offlineCameras.map(cam => ({
        cameraId: cam.cameraId,
        isOnline: cam.isOnline,
        lastCheck: cam.lastCheck,
      })),
    });
  } catch (error) {
    console.error('[streams] Error obteniendo health:', error);
    return res.status(500).json({
      ok: false,
      message: 'Error al obtener estado de salud',
    });
  }
});

/**
 * GET /streams/health/:cameraId
 * Obtiene el estado de salud de una cámara específica
 */
router.get('/health/:cameraId', async (req: AuthenticatedRequest, res) => {
  try {
    const { cameraId } = req.params;
    
    if (!cameraId) {
      return res.status(400).json({
        ok: false,
        message: 'ID de cámara requerido',
      });
    }
    
    const health = await getCameraHealth(cameraId);
    
    return res.json({
      ok: true,
      health,
    });
  } catch (error) {
    console.error('[streams] Error obteniendo health de cámara:', error);
    return res.status(500).json({
      ok: false,
      message: 'Error al obtener estado de cámara',
    });
  }
});

export default router;
