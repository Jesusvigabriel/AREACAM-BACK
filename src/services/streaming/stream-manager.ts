/**
 * Stream Manager - Gestión de streaming con MediaMTX
 * Sincroniza cámaras desde la DB y genera configuración dinámica
 */

import fs from 'fs/promises';
import yaml from 'js-yaml';
import pool from '../../db';
import type { RowDataPacket } from 'mysql2/promise';
import { readCameraSettingsFromDetails, isTimeWithinSchedule } from '../camera-settings';

const MEDIAMTX_BASE_CONFIG_PATH = '/home/camaras-area54/AREACAM/areacam/backend/config/mediamtx.yml';
const MEDIAMTX_OUTPUT_CONFIG_PATH = process.env.MEDIAMTX_CONFIG_PATH || '/home/camaras-area54/mediamtx_areacam.yml';
const MEDIAMTX_API_URL = process.env.MEDIAMTX_API_URL || 'http://localhost:9997';
const HLS_BASE_URL = process.env.HLS_BASE_URL || 'http://localhost:8888';
const WEBRTC_BASE_URL = process.env.WEBRTC_BASE_URL || 'http://localhost:8889';
const RTSP_BASE_URL = process.env.RTSP_BASE_URL || 'rtsp://localhost:8554';

interface CameraRow extends RowDataPacket {
  mid: string;
  name: string;
  protocol: string;
  host: string;
  port: string;
  path: string;
  mode: string;
  details: string | null;
}

interface MediaMTXPath {
  source: string;
  sourceProtocol?: string;
  sourceOnDemand?: boolean;
  record?: boolean;
  [key: string]: any;
}

interface MediaMTXConfig {
  logLevel: string;
  logDestinations: string[];
  logFile: string;
  api: boolean;
  apiAddress: string;
  metrics: boolean;
  metricsAddress: string;
  rtspAddress: string;
  protocols: string[];
  encryption: string;
  hls: boolean;
  hlsAddress: string;
  hlsAlwaysRemux: boolean;
  hlsVariant: string;
  hlsSegmentCount: number;
  hlsSegmentDuration: string;
  hlsPartDuration: string;
  hlsSegmentMaxSize: string;
  webrtc: boolean;
  webrtcAddress: string;
  webrtcICEServers2: any[];
  record: boolean;
  recordPath: string;
  recordFormat: string;
  recordPartDuration: string;
  recordSegmentDuration: string;
  recordDeleteAfter: string;
  pathDefaults: Record<string, any>;
  paths: Record<string, MediaMTXPath>;
}

/**
 * Obtiene todas las cámaras activas de la base de datos
 */
async function getActiveCameras(): Promise<CameraRow[]> {
  const [cameras] = await pool.execute<CameraRow[]>(
    `SELECT mid, name, protocol, host, port, path, mode, details 
     FROM Monitors 
     WHERE mode IN ('start', 'record')
     ORDER BY name ASC`
  );
  
  return cameras;
}

/**
 * Construye la URL RTSP completa con credenciales
 */
function buildRTSPUrl(camera: CameraRow): string {
  const protocol = camera.protocol || 'rtsp';
  const host = camera.host;
  const port = camera.port || '554';
  const path = camera.path || '/';
  
  // Extraer credenciales de details si existen
  let username = '';
  let password = '';
  
  if (camera.details) {
    try {
      const details = typeof camera.details === 'string' 
        ? JSON.parse(camera.details) 
        : camera.details;
      
      username = details.muser || '';
      password = details.mpass || '';
    } catch (error) {
      console.warn(`[stream-manager] Error parseando details de ${camera.name}`);
    }
  }
  
  // Construir URL
  let url = `${protocol}://`;
  if (username && password) {
    url += `${username}:${password}@`;
  }
  url += `${host}:${port}${path}`;
  
  return url;
}

/**
 * Sincroniza las cámaras con MediaMTX
 * Genera la configuración YAML con todas las cámaras activas
 */
export async function syncCamerasToMediaMTX(): Promise<{
  success: boolean;
  camerasConfigured: number;
  errors: string[];
}> {
  const errors: string[] = [];
  
  try {
    console.log('[stream-manager] 🔄 Iniciando sincronización de cámaras...');
    
    // Leer configuración base (plantilla)
    const configContent = await fs.readFile(MEDIAMTX_BASE_CONFIG_PATH, 'utf8');
    const config = yaml.load(configContent) as MediaMTXConfig;
    
    // Obtener cámaras activas
    const cameras = await getActiveCameras();
    console.log(`[stream-manager] 📹 Encontradas ${cameras.length} cámaras activas`);
    
    // Limpiar paths existentes
    config.paths = {};
    
    // Agregar cada cámara como path
    const now = new Date();
    
    for (const camera of cameras) {
      try {
        const rtspUrl = buildRTSPUrl(camera);
        const cameraId = camera.mid;
        
        // Leer configuración de horarios desde details
        let details: Record<string, unknown> = {};
        if (camera.details) {
          try {
            if (typeof camera.details === 'string') {
              details = JSON.parse(camera.details);
            } else if (typeof camera.details === 'object' && camera.details !== null) {
              details = camera.details as Record<string, unknown>;
            }
          } catch (error) {
            console.warn(`[stream-manager] No se pudieron parsear detalles de ${camera.name}`);
          }
        }
        
        const cameraSettings = readCameraSettingsFromDetails(details);
        const isWithinSchedule = isTimeWithinSchedule(now, cameraSettings);
        
        // LÓGICA DE GRABACIÓN:
        // - TODAS las cámaras hacen streaming 24/7 (siempre visibles)
        // - mode='record' + dentro del horario → grabación continua programada
        // - mode='record' + fuera del horario → grabación temporal por movimiento (5 min)
        //   El recording-trigger.ts se encarga de cambiar a mode='start' después
        // - mode='start' → solo streaming, sin grabación
        // - mode='stop' → cámara desactivada (no aparece en MediaMTX)
        
        // Grabar si mode='record' (ya sea por horario programado o por movimiento detectado)
        const shouldRecord = camera.mode === 'record';
        
        // Path principal (alta calidad) - SIEMPRE activo para streaming
        config.paths[cameraId] = {
          source: rtspUrl,
          sourceProtocol: 'tcp',
          sourceOnDemand: false,
          record: shouldRecord,
        };
        
        // Estado para logs
        let scheduleStatus = '📡 STREAMING';
        if (camera.mode === 'record') {
          scheduleStatus = isWithinSchedule 
            ? '🔴 GRABANDO (horario)' 
            : '👁️  STREAMING + DETECCIÓN (fuera de horario)';
        }
        
        
        console.log(`[stream-manager] ✅ ${camera.name} (${cameraId}) - ${scheduleStatus}`);
      } catch (error) {
        const errorMsg = `Error configurando ${camera.name}: ${error}`;
        console.error(`[stream-manager] ❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }
    
    // Escribir configuración actualizada
    const newConfigContent = yaml.dump(config, {
      indent: 2,
      lineWidth: -1,
      quotingType: '"',
      forceQuotes: false,
    });
    
    await fs.writeFile(MEDIAMTX_OUTPUT_CONFIG_PATH, newConfigContent, 'utf8');
    
    console.log(`[stream-manager] ✅ Configuración actualizada: ${cameras.length} cámaras`);
    console.log(`[stream-manager] 📝 Archivo: ${MEDIAMTX_OUTPUT_CONFIG_PATH}`);
    
    return {
      success: true,
      camerasConfigured: cameras.length,
      errors,
    };
    
  } catch (error) {
    console.error('[stream-manager] ❌ Error en sincronización:', error);
    return {
      success: false,
      camerasConfigured: 0,
      errors: [`Error general: ${error}`],
    };
  }
}

/**
 * Obtiene las URLs de streaming para una cámara
 */
export function getStreamUrls(cameraId: string): {
  hls: string;
  webrtc: string;
  rtsp: string;
} {
  return {
    hls: `${HLS_BASE_URL}/${cameraId}/index.m3u8`,
    webrtc: `${WEBRTC_BASE_URL}/${cameraId}`,
    rtsp: `${RTSP_BASE_URL}/${cameraId}`,
  };
}

/**
 * Actualiza solo una cámara específica en MediaMTX
 * Por ahora regenera todo el YAML (la API de MediaMTX requiere autenticación)
 * TODO: Implementar autenticación para usar la API y hacer updates parciales
 */
export async function updateSingleCamera(cameraId: string): Promise<void> {
  try {
    console.log(`[stream-manager] ⚡ Actualizando configuración completa de MediaMTX...`);
    await syncCamerasToMediaMTX();
  } catch (error) {
    console.error(`[stream-manager] Error en updateSingleCamera:`, error);
  }
}

/**
 * Verifica si MediaMTX está corriendo
 */
export async function checkMediaMTXStatus(): Promise<boolean> {
  try {
    const response = await fetch(`${MEDIAMTX_API_URL}/v3/config/global/get`);
    return response.ok;
  } catch (error) {
    return false;
  }
}
