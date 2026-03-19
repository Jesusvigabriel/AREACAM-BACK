import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { getActiveSessions, getRecordingStatus } from '../services/motion/recording-trigger';

const router = Router();

router.use(requireAuth);

/**
 * GET /motion-recordings/active
 * Obtiene todas las sesiones de grabación activas por movimiento
 */
router.get('/active', async (_req: AuthenticatedRequest, res) => {
  try {
    const sessions = getActiveSessions();
    
    return res.json({
      ok: true,
      count: sessions.length,
      sessions,
    });
  } catch (error) {
    console.error('[motion-recordings] Error obteniendo sesiones activas:', error);
    return res.status(500).json({
      ok: false,
      message: 'Error al obtener sesiones activas',
    });
  }
});

/**
 * GET /motion-recordings/status/:cameraId
 * Obtiene el estado de grabación de una cámara específica
 */
router.get('/status/:cameraId', async (req: AuthenticatedRequest, res) => {
  try {
    const cameraId = req.params.cameraId;
    if (!cameraId) {
      return res.status(400).json({ ok: false, message: 'Camera ID requerido' });
    }
    const status = getRecordingStatus(cameraId);
    
    return res.json({
      ok: true,
      cameraId,
      ...status,
    });
  } catch (error) {
    console.error('[motion-recordings] Error obteniendo estado:', error);
    return res.status(500).json({
      ok: false,
      message: 'Error al obtener estado de grabación',
    });
  }
});

export default router;
