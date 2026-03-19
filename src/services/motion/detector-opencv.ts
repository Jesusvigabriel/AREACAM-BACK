import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'fs/promises';
import path from 'path';

interface DetectMotionOptions {
  rtspUrl: string;
  sensitivity: number;
  timeoutMs?: number;
}

export interface MotionDetectionResult {
  motionDetected: boolean;
  snapshotPath?: string;
  snapshotFilename?: string;
  motionFrames?: number;
  totalFrames?: number;
  maxContourArea?: number;
}

const MOTION_STORAGE_DIR = path.join(process.cwd(), 'storage', 'motion-events');
const PYTHON_SCRIPT = path.join(process.cwd(), 'scripts', 'motion_detector_opencv.py');

async function ensureStorageDir(): Promise<void> {
  await fs.mkdir(MOTION_STORAGE_DIR, { recursive: true });
}

export function getMotionStorageDir(): string {
  return MOTION_STORAGE_DIR;
}

/**
 * Mapea sensibilidad (0-100) a área mínima de píxeles
 * Sensibilidad alta = área mínima baja (detecta objetos pequeños)
 * Sensibilidad baja = área mínima alta (solo objetos grandes)
 */
function mapSensitivityToMinArea(sensitivity: number): number {
  const clamped = Math.min(100, Math.max(0, sensitivity));
  // Rango: 2000px (baja sensibilidad) a 300px (alta sensibilidad)
  const maxArea = 2000;
  const minArea = 300;
  return Math.round(maxArea - (clamped / 100) * (maxArea - minArea));
}

/**
 * Detector de movimiento usando OpenCV MOG2 (Background Subtraction)
 * Mucho más preciso que FFmpeg para detectar objetos en movimiento
 */
export async function detectMotionWithOpenCV(options: DetectMotionOptions): Promise<MotionDetectionResult> {
  await ensureStorageDir();

  const timeoutMs = options.timeoutMs ?? 10000; // 10 segundos por defecto
  const filename = `${Date.now()}-${randomUUID()}.jpg`;
  const snapshotPath = path.join(MOTION_STORAGE_DIR, filename);
  const minArea = mapSensitivityToMinArea(options.sensitivity);

  console.log(`[motion-detector-opencv] Ejecutando con sensibilidad: ${options.sensitivity}%, área mínima: ${minArea}px`);

  const args = [
    PYTHON_SCRIPT,
    '--rtsp-url', options.rtspUrl,
    '--output', snapshotPath,
    '--sensitivity', String(options.sensitivity),
    '--min-area', String(minArea),
    '--duration', '5', // Analizar 5 segundos de video
  ];

  return new Promise((resolve) => {
    const child = spawn('python3', args);
    
    let stdout = '';
    let stderr = '';

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      console.error('[motion-detector-opencv] Timeout alcanzado');
      resolve({ motionDetected: false });
    }, timeoutMs);

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
      // Mostrar logs del script Python en tiempo real
      process.stderr.write(data);
    });

    child.on('close', async (code) => {
      clearTimeout(timer);

      try {
        // Parsear resultado JSON del script Python
        const result = JSON.parse(stdout.trim());

        if (result.error) {
          console.error(`[motion-detector-opencv] Error: ${result.error}`);
          resolve({ motionDetected: false });
          return;
        }

        if (result.motion_detected && result.snapshot_path) {
          // Verificar que el archivo existe
          const stat = await fs.stat(result.snapshot_path);
          if (stat.size > 0) {
            resolve({
              motionDetected: true,
              snapshotPath: result.snapshot_path,
              snapshotFilename: filename,
              motionFrames: result.motion_frames,
              totalFrames: result.total_frames,
              maxContourArea: result.max_contour_area,
            });
            return;
          }
        }

        resolve({ 
          motionDetected: false,
          motionFrames: result.motion_frames,
          totalFrames: result.total_frames,
          maxContourArea: result.max_contour_area,
        });

      } catch (error) {
        console.error('[motion-detector-opencv] Error parseando resultado:', error);
        console.error('[motion-detector-opencv] stdout:', stdout);
        console.error('[motion-detector-opencv] stderr:', stderr);
        resolve({ motionDetected: false });
      }
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      console.error('[motion-detector-opencv] Error ejecutando Python:', error);
      resolve({ motionDetected: false });
    });
  });
}
