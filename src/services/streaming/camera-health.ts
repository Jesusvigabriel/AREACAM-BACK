/**
 * Camera Health Check Service
 * Verifica el estado de las cámaras en MediaMTX y marca las inactivas
 */

const MEDIAMTX_API_URL = process.env.MEDIAMTX_API_URL || 'http://localhost:9997';

interface CameraHealth {
  cameraId: string;
  isOnline: boolean;
  hasReaders: boolean;
  bytesReceived: number;
  lastCheck: Date;
}

/**
 * Obtiene el estado de una cámara específica desde MediaMTX
 */
export async function getCameraHealth(cameraId: string): Promise<CameraHealth> {
  try {
    const response = await fetch(`${MEDIAMTX_API_URL}/v3/paths/get/${cameraId}`);
    
    if (!response.ok) {
      return {
        cameraId,
        isOnline: false,
        hasReaders: false,
        bytesReceived: 0,
        lastCheck: new Date(),
      };
    }
    
    const data = await response.json();
    
    // Verificar si la cámara está recibiendo datos
    const isOnline = data.sourceReady === true;
    const hasReaders = (data.readers?.length || 0) > 0;
    const bytesReceived = data.bytesReceived || 0;
    
    return {
      cameraId,
      isOnline,
      hasReaders,
      bytesReceived,
      lastCheck: new Date(),
    };
  } catch (error) {
    console.error(`[camera-health] Error verificando ${cameraId}:`, error);
    return {
      cameraId,
      isOnline: false,
      hasReaders: false,
      bytesReceived: 0,
      lastCheck: new Date(),
    };
  }
}

/**
 * Obtiene el estado de todas las cámaras
 */
export async function getAllCamerasHealth(): Promise<Map<string, CameraHealth>> {
  const healthMap = new Map<string, CameraHealth>();
  
  try {
    const response = await fetch(`${MEDIAMTX_API_URL}/v3/paths/list`);
    
    if (!response.ok) {
      console.error('[camera-health] Error obteniendo lista de cámaras');
      return healthMap;
    }
    
    const data = await response.json();
    const cameras = data.items || [];
    
    for (const camera of cameras) {
      const health: CameraHealth = {
        cameraId: camera.name,
        isOnline: camera.sourceReady === true,
        hasReaders: (camera.readers?.length || 0) > 0,
        bytesReceived: camera.bytesReceived || 0,
        lastCheck: new Date(),
      };
      
      healthMap.set(camera.name, health);
    }
    
    return healthMap;
  } catch (error) {
    console.error('[camera-health] Error obteniendo estado de cámaras:', error);
    return healthMap;
  }
}

/**
 * Obtiene lista de cámaras offline
 */
export async function getOfflineCameras(): Promise<CameraHealth[]> {
  const healthMap = await getAllCamerasHealth();
  return Array.from(healthMap.values()).filter(camera => !camera.isOnline);
}

/**
 * Obtiene estadísticas de salud del sistema
 */
export async function getHealthStats(): Promise<{
  total: number;
  online: number;
  offline: number;
  withReaders: number;
}> {
  const healthMap = await getAllCamerasHealth();
  const cameras = Array.from(healthMap.values());
  
  return {
    total: cameras.length,
    online: cameras.filter(c => c.isOnline).length,
    offline: cameras.filter(c => !c.isOnline).length,
    withReaders: cameras.filter(c => c.hasReaders).length,
  };
}
