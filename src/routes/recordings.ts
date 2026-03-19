import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import yaml from 'js-yaml';

const execAsync = promisify(exec);
const router = Router();

const MEDIAMTX_BASE_CONFIG_PATH = '/home/camaras-area54/AREACAM/areacam/backend/config/mediamtx.yml';

/**
 * Obtiene la ruta base de grabaciones desde la configuración de MediaMTX
 */
async function getRecordingsBasePath(): Promise<string> {
  try {
    const configContent = await fs.readFile(MEDIAMTX_BASE_CONFIG_PATH, 'utf8');
    const config: any = yaml.load(configContent);
    const recordPath = config.recordPath || '/mnt/videos/areacam/recordings/%path/%Y-%m-%d_%H-%M-%S';
    
    // Extraer solo la parte base (antes de %path)
    const basePath = recordPath.split('%path')[0];
    return basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
  } catch (error) {
    console.warn('[recordings] No se pudo leer config de MediaMTX, usando ruta por defecto');
    return '/mnt/videos/areacam/recordings';
  }
}

// Directorio base donde se guardan las grabaciones
const RECORDINGS_BASE_PATH = process.env.RECORDINGS_PATH || '/mnt/videos/areacam/recordings';

router.use(requireAuth);

/**
 * GET /recordings/:mid
 * Lista las grabaciones disponibles para un monitor
 */
router.get('/:mid', async (req: AuthenticatedRequest, res) => {
  try {
    const { mid } = req.params;
    const { startDate, endDate } = req.query;
    
    if (!mid) {
      return res.status(400).json({ ok: false, message: 'Monitor ID requerido' });
    }
    
    const basePath = await getRecordingsBasePath();
    const monitorPath = path.join(basePath, mid);

    // Parsear fechas de filtro en zona horaria local
    let filterStartDate: Date | null = null;
    let filterEndDate: Date | null = null;
    
    if (startDate && typeof startDate === 'string') {
      // Parsear como fecha local (no UTC)
      const parts = startDate.split('-').map(Number);
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        filterStartDate = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
      }
    }
    
    if (endDate && typeof endDate === 'string') {
      // Parsear como fecha local (no UTC)
      const parts = endDate.split('-').map(Number);
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
        filterEndDate = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999);
      }
    }

    try {
      const files = await fs.readdir(monitorPath);
      
      const recordings = files
        .filter(f => f.endsWith('.mp4') || f.endsWith('.fmp4'))
        .map(filename => {
          // Soportar tanto guiones como dos puntos en el formato de hora
          const match = filename.match(/(\d{4})-(\d{2})-(\d{2})_(\d{2})[-:](\d{2})[-:](\d{2})\.(mp4|fmp4)/);
          if (!match) return null;
          
          const [, year, month, day, hour, minute, second] = match;
          const timestamp = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
          
          return {
            filename,
            timestamp: timestamp.toISOString(),
            downloadUrl: `/recordings/${mid}/download/${filename}`,
            streamUrl: `/recordings/${mid}/stream/${filename}`,
            date: timestamp,
          };
        })
        .filter((recording): recording is { filename: string; timestamp: string; downloadUrl: string; streamUrl: string; date: Date } => {
          if (!recording) return false;
          
          // Aplicar filtros de fecha si existen
          if (filterStartDate && recording.date < filterStartDate) return false;
          if (filterEndDate && recording.date > filterEndDate) return false;
          
          return true;
        })
        .map(({ filename, timestamp, downloadUrl, streamUrl }) => ({ filename, timestamp, downloadUrl, streamUrl }))
        .sort((a, b) => new Date(b!.timestamp).getTime() - new Date(a!.timestamp).getTime());

      return res.json({
        ok: true,
        recordings,
      });
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return res.json({
          ok: true,
          recordings: [],
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('[recordings] Error listando grabaciones:', error);
    return res.status(500).json({
      ok: false,
      message: 'Error al listar grabaciones',
    });
  }
});

/**
 * GET /recordings/:mid/stream/:filename
 * Streaming de video para preview (permite auth por query params)
 */
router.get('/:mid/stream/:filename', async (req: AuthenticatedRequest, res) => {
  try {
    const { mid, filename } = req.params;
    
    if (!mid || !filename) {
      return res.status(400).json({ ok: false, message: 'Parámetros requeridos' });
    }
    
    // Validar que el filename solo contenga caracteres seguros
    if (!/^[\w-]+\.(mp4|fmp4)$/.test(filename)) {
      return res.status(400).json({
        ok: false,
        message: 'Nombre de archivo inválido',
      });
    }

    const basePath = await getRecordingsBasePath();
    const filePath = path.join(basePath, mid, filename);

    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        ok: false,
        message: 'Archivo no encontrado',
      });
    }

    // Servir el archivo como stream de video
    const stat = await fs.stat(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0] || '0', 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      });
      
      const readStream = require('fs').createReadStream(filePath, { start, end });
      readStream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      });
      
      const readStream = require('fs').createReadStream(filePath);
      readStream.pipe(res);
    }
  } catch (error) {
    console.error('[recordings] Error en streaming:', error);
    return res.status(500).json({
      ok: false,
      message: 'Error al procesar el streaming',
    });
  }
});

/**
 * GET /recordings/:mid/download/:filename
 * Descarga un archivo de grabación específico
 */
router.get('/:mid/download/:filename', async (req: AuthenticatedRequest, res) => {
  try {
    const { mid, filename } = req.params;
    
    if (!mid || !filename) {
      return res.status(400).json({ ok: false, message: 'Parámetros requeridos' });
    }
    
    // Validar que el filename solo contenga caracteres seguros
    if (!/^[\w-]+\.(mp4|fmp4)$/.test(filename)) {
      return res.status(400).json({
        ok: false,
        message: 'Nombre de archivo inválido',
      });
    }

    const basePath = await getRecordingsBasePath();
    const filePath = path.join(basePath, mid, filename);

    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        ok: false,
        message: 'Archivo no encontrado',
      });
    }

    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('[recordings] Error descargando archivo:', err);
        if (!res.headersSent) {
          res.status(500).json({
            ok: false,
            message: 'Error al descargar el archivo',
          });
        }
      }
    });
  } catch (error) {
    console.error('[recordings] Error en descarga:', error);
    return res.status(500).json({
      ok: false,
      message: 'Error al procesar la descarga',
    });
  }
});

/**
 * POST /recordings/:mid/refresh
 * Refresca el stream de un monitor (útil cuando se cuelga)
 */
router.post('/:mid/refresh', async (req: AuthenticatedRequest, res) => {
  try {
    const { mid } = req.params;
    
    if (!mid) {
      return res.status(400).json({ ok: false, message: 'Monitor ID requerido' });
    }
    
    // Refrescar stream - el frontend puede recargar el player
    
    return res.json({
      ok: true,
      message: 'Stream refrescado. Recarga el reproductor.',
    });
  } catch (error) {
    console.error('[recordings] Error refrescando stream:', error);
    return res.status(500).json({
      ok: false,
      message: 'Error al refrescar el stream',
    });
  }
});

export default router;
