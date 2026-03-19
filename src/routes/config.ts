import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/roles';
import {
  readMotionEmailConfig,
  writeMotionEmailConfig,
  mergeMotionEmailConfig,
  type MotionEmailConfig,
} from '../services/notification-config';
import { invalidateMotionEmailTransport } from '../services/motion-email';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import yaml from 'js-yaml';
import { syncCamerasToMediaMTX } from '../services/streaming/stream-manager';
import multer from 'multer';
import path from 'path';

const execAsync = promisify(exec);
const router = Router();

// Configurar multer para subida de archivos de branding
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fs.mkdir(BRANDING_PATH, { recursive: true });
      cb(null, BRANDING_PATH);
    } catch (error) {
      cb(error as Error, BRANDING_PATH);
    }
  },
  filename: (req, file, cb) => {
    const type = req.body.type;
    const ext = path.extname(file.originalname);
    cb(null, `${type}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|ico|svg|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, ico, svg, webp)'));
    }
  }
});

const MEDIAMTX_CONFIG_PATH = '/home/camaras-area54/mediamtx_areacam.yml';
const MEDIAMTX_BASE_CONFIG_PATH = '/home/camaras-area54/AREACAM/areacam/backend/config/mediamtx.yml';
const RECORDINGS_PATH = '/mnt/videos/areacam/recordings';
const BRANDING_PATH = path.join(RECORDINGS_PATH, 'branding');
const BRANDING_CONFIG_FILE = path.join(BRANDING_PATH, 'config.json');

/**
 * GET /config/branding
 * Obtiene la configuración de branding
 */
router.get('/branding', async (_req: AuthenticatedRequest, res) => {
  try {
    // Crear directorio si no existe
    await fs.mkdir(BRANDING_PATH, { recursive: true });

    // Leer configuración
    let config = {
      faviconUrl: undefined,
      backgroundUrl: undefined,
      companyLogoUrl: undefined,
    };

    try {
      const configContent = await fs.readFile(BRANDING_CONFIG_FILE, 'utf8');
      config = JSON.parse(configContent);
    } catch (error) {
      // Si no existe el archivo, devolver config vacía
    }

    return res.json({ ok: true, config });
  } catch (error) {
    console.error('[config] Error obteniendo branding:', error);
    return res.status(500).json({ ok: false, message: 'Error al obtener configuración de branding' });
  }
});

router.use(requireAuth);


/**
 * GET /config/notifications/email
 * Obtiene la configuración global de notificaciones por correo
 */
router.get('/notifications/email', requireAdmin, async (_req: AuthenticatedRequest, res) => {
  try {
    const config = await readMotionEmailConfig();
    return res.json({ ok: true, config });
  } catch (error) {
    console.error('[config] Error leyendo config de correo:', error);
    return res.status(500).json({ ok: false, message: 'Error al leer configuración de correo' });
  }
});

/**
 * PATCH /config/notifications/email
 * Actualiza la configuración global de notificaciones por correo
 */
router.patch('/notifications/email', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const current = await readMotionEmailConfig();
    const updates = req.body as Partial<MotionEmailConfig>;

    const merged = mergeMotionEmailConfig(current, updates);
    await writeMotionEmailConfig(merged);
    invalidateMotionEmailTransport();

    return res.json({ ok: true, message: 'Configuración de correo actualizada', config: merged });
  } catch (error) {
    console.error('[config] Error actualizando config de correo:', error);
    return res.status(500).json({ ok: false, message: 'Error al actualizar configuración de correo' });
  }
});

/**
 * GET /config/recording
 * Obtiene la configuración global de grabaciones de MediaMTX
 */
router.get('/recording', requireAdmin, async (_req: AuthenticatedRequest, res) => {
  try {
    // Leer configuración actual del YAML base
    const configContent = await fs.readFile(MEDIAMTX_BASE_CONFIG_PATH, 'utf8');
    const config: any = yaml.load(configContent);
    
    const recordingConfig = {
      enabled: config.record || false,
      recordPath: config.recordPath || '/mnt/videos/areacam/recordings/%path/%Y-%m-%d_%H-%M-%S',
      format: config.recordFormat || 'fmp4',
      recordPartDuration: config.recordPartDuration || '10m',
      recordSegmentDuration: config.recordSegmentDuration || '1h',
      recordDeleteAfter: config.recordDeleteAfter || '168h',
    };
    
    return res.json({ 
      ok: true, 
      config: recordingConfig 
    });
  } catch (error) {
    console.error('[config] Error obteniendo config de grabación:', error);
    return res.status(500).json({ 
      ok: false, 
      message: 'Error al obtener configuración de grabación' 
    });
  }
});

/**
 * GET /config/storage-info
 * Obtiene información del espacio de almacenamiento
 */
router.get('/storage-info', requireAdmin, async (_req: AuthenticatedRequest, res) => {
  try {
    // Usar LC_ALL=C para obtener output en formato internacional (sin comas)
    const { stdout: dfOutput } = await execAsync(`LC_ALL=C df -h ${RECORDINGS_PATH} | tail -1`);
    const dfParts = dfOutput.trim().split(/\s+/);
    
    // Obtener tamaño de grabaciones
    const { stdout: duOutput } = await execAsync(`LC_ALL=C du -sh ${RECORDINGS_PATH} 2>/dev/null || echo "0 ${RECORDINGS_PATH}"`);
    const recordingsSize = duOutput.trim().split(/\s+/)[0];
    
    // Contar archivos
    const { stdout: countOutput } = await execAsync(`find ${RECORDINGS_PATH} -type f 2>/dev/null | wc -l`);
    const fileCount = parseInt(countOutput.trim()) || 0;
    
    const storageInfo = {
      path: RECORDINGS_PATH,
      total: dfParts[1] || 'N/A',
      used: dfParts[2] || 'N/A',
      available: dfParts[3] || 'N/A',
      usedPercent: dfParts[4] || 'N/A',
      recordingsSize,
      fileCount,
    };
    
    return res.json({ 
      ok: true, 
      storage: storageInfo 
    });
  } catch (error) {
    console.error('[config] Error obteniendo info de almacenamiento:', error);
    return res.status(500).json({ 
      ok: false, 
      message: 'Error al obtener información de almacenamiento' 
    });
  }
});

/**
 * PATCH /config/recording
 * Actualiza la configuración global de grabaciones y regenera el YAML
 */
router.patch('/recording', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    console.log('[config] Actualizando configuración de grabación...');
    
    // Leer configuración actual
    const configContent = await fs.readFile(MEDIAMTX_BASE_CONFIG_PATH, 'utf8');
    const config: any = yaml.load(configContent);
    
    // Actualizar valores (aceptar tanto nombres con prefijo como sin prefijo)
    if (req.body.enabled !== undefined) config.record = req.body.enabled;
    if (req.body.recordPath || req.body.path) config.recordPath = req.body.recordPath || req.body.path;
    if (req.body.format) config.recordFormat = req.body.format;
    if (req.body.recordPartDuration || req.body.partDuration) config.recordPartDuration = req.body.recordPartDuration || req.body.partDuration;
    if (req.body.recordSegmentDuration || req.body.segmentDuration) config.recordSegmentDuration = req.body.recordSegmentDuration || req.body.segmentDuration;
    if (req.body.recordDeleteAfter || req.body.deleteAfter) config.recordDeleteAfter = req.body.recordDeleteAfter || req.body.deleteAfter;
    
    // Guardar configuración base actualizada
    const newConfigContent = yaml.dump(config, {
      indent: 2,
      lineWidth: -1,
      quotingType: '"',
      forceQuotes: false,
    });
    await fs.writeFile(MEDIAMTX_BASE_CONFIG_PATH, newConfigContent, 'utf8');
    
    console.log('[config] ✅ Configuración base actualizada');
    
    // Regenerar configuración con cámaras
    console.log('[config] 🔄 Regenerando configuración con cámaras...');
    await syncCamerasToMediaMTX();
    
    console.log('[config] ✅ MediaMTX recargará automáticamente');
    
    const recordingConfig = {
      enabled: config.record,
      recordPath: config.recordPath,
      format: config.recordFormat,
      recordPartDuration: config.recordPartDuration,
      recordSegmentDuration: config.recordSegmentDuration,
      recordDeleteAfter: config.recordDeleteAfter,
    };
    
    return res.json({ 
      ok: true, 
      message: 'Configuración de grabación actualizada. MediaMTX recargará automáticamente.',
      config: recordingConfig 
    });
  } catch (error) {
    console.error('[config] Error actualizando config de grabación:', error);
    return res.status(500).json({ 
      ok: false, 
      message: 'Error al actualizar configuración de grabación' 
    });
  }
});

/**
 * POST /config/branding/upload
 * Sube un archivo de branding
 */
router.post('/branding/upload', requireAdmin, upload.single('file'), async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, message: 'No se proporcionó ningún archivo' });
    }
    
    const type = req.body.type as 'favicon' | 'background' | 'logo';
    if (!['favicon', 'background', 'logo'].includes(type)) {
      return res.status(400).json({ ok: false, message: 'Tipo de archivo inválido' });
    }
    
    // Leer configuración actual
    let config: any = {};
    try {
      const configContent = await fs.readFile(BRANDING_CONFIG_FILE, 'utf8');
      config = JSON.parse(configContent);
    } catch (error) {
      // Si no existe, crear nueva
    }
    
    // Actualizar URL según el tipo
    const url = `/uploads/branding/${req.file.filename}`;
    if (type === 'favicon') {
      config.faviconUrl = url;
    } else if (type === 'background') {
      config.backgroundUrl = url;
    } else if (type === 'logo') {
      config.companyLogoUrl = url;
    }
    
    // Guardar configuración
    await fs.writeFile(BRANDING_CONFIG_FILE, JSON.stringify(config, null, 2));
    
    console.log(`[config] ✅ ${type} actualizado: ${url}`);
    
    return res.json({ ok: true, url });
  } catch (error) {
    console.error('[config] Error subiendo archivo de branding:', error);
    return res.status(500).json({ ok: false, message: 'Error al subir archivo' });
  }
});

/**
 * DELETE /config/branding/:type
 * Elimina un archivo de branding
 */
router.delete('/branding/:type', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const type = req.params.type as 'favicon' | 'background' | 'logo';
    if (!['favicon', 'background', 'logo'].includes(type)) {
      return res.status(400).json({ ok: false, message: 'Tipo inválido' });
    }
    
    // Leer configuración actual
    let config: any = {};
    try {
      const configContent = await fs.readFile(BRANDING_CONFIG_FILE, 'utf8');
      config = JSON.parse(configContent);
    } catch (error) {
      return res.status(404).json({ ok: false, message: 'No hay configuración de branding' });
    }
    
    // Obtener la URL del archivo a eliminar
    let fileUrl: string | undefined;
    if (type === 'favicon') {
      fileUrl = config.faviconUrl;
      config.faviconUrl = undefined;
    } else if (type === 'background') {
      fileUrl = config.backgroundUrl;
      config.backgroundUrl = undefined;
    } else if (type === 'logo') {
      fileUrl = config.companyLogoUrl;
      config.companyLogoUrl = undefined;
    }
    
    // Eliminar archivo físico si existe
    if (fileUrl) {
      const filename = path.basename(fileUrl);
      const filepath = path.join(BRANDING_PATH, filename);
      try {
        await fs.unlink(filepath);
        console.log(`[config] 🗑️ Archivo eliminado: ${filepath}`);
      } catch (error) {
        console.error('[config] Error eliminando archivo:', error);
      }
    }
    
    // Guardar configuración actualizada
    await fs.writeFile(BRANDING_CONFIG_FILE, JSON.stringify(config, null, 2));
    
    const typeNames = {
      favicon: 'Favicon',
      background: 'Fondo',
      logo: 'Logo de empresa'
    };
    
    console.log(`[config] ✅ ${typeNames[type]} eliminado`);
    
    return res.json({ 
      ok: true, 
      message: `${typeNames[type]} eliminado correctamente` 
    });
  } catch (error) {
    console.error('[config] Error eliminando archivo de branding:', error);
    return res.status(500).json({ ok: false, message: 'Error al eliminar archivo' });
  }
});

export default router;
