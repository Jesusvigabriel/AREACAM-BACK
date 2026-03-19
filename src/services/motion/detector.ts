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

function mapSensitivityToThreshold(sensitivity: number): number {
  const clamped = Math.min(100, Math.max(0, sensitivity));
  // Para mpdecimate: valores más bajos = más sensible
  // Rango: 0.001 (muy sensible) a 0.1 (poco sensible)
  const minThreshold = 0.001; // muy sensible
  const maxThreshold = 0.1;   // poco sensible
  return maxThreshold - (clamped / 100) * (maxThreshold - minThreshold);
}

async function ensureStorageDir(): Promise<void> {
  await fs.mkdir(MOTION_STORAGE_DIR, { recursive: true });
}

export function getMotionStorageDir(): string {
  return MOTION_STORAGE_DIR;
}

export async function detectMotionWithFFmpeg(options: DetectMotionOptions): Promise<MotionDetectionResult> {
  await ensureStorageDir();

  const timeoutMs = options.timeoutMs ?? 6000;
  const threshold = mapSensitivityToThreshold(options.sensitivity);
  const filename = `${Date.now()}-${randomUUID()}.jpg`;
  const snapshotPath = path.join(MOTION_STORAGE_DIR, filename);

  // Estrategia: capturar 3 segundos de video y usar mpdecimate para detectar movimiento
  // mpdecimate elimina frames duplicados/similares, si quedan frames = hay movimiento
  const args = [
    '-hide_banner',
    '-loglevel',
    'error',
    '-rtsp_transport',
    'tcp',
    '-i',
    options.rtspUrl,
    '-t',
    '3', // Capturar 3 segundos
    '-vf',
    // mpdecimate: elimina frames sin cambios significativos
    // hi/lo: umbrales de diferencia entre frames (más bajo = más sensible)
    // frac: fracción de pixeles que deben cambiar
    `scale=640:360,mpdecimate=hi=${(threshold * 512).toFixed(0)}:lo=${(threshold * 256).toFixed(0)}:frac=0.33`,
    '-vsync',
    'vfr',
    '-frames:v',
    '1', // Solo queremos 1 frame (si hay movimiento)
    '-y',
    snapshotPath,
  ];
  
  console.log(`[motion-detector] Ejecutando FFmpeg con sensibilidad: ${options.sensitivity}, umbral: ${threshold.toFixed(4)} (mpdecimate)`);

  const child = spawn('ffmpeg', args, { stdio: 'ignore' });

  const result = await new Promise<{ exitCode: number | null; signal: NodeJS.Signals | null }>((resolve) => {
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
    }, timeoutMs);

    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolve({ exitCode: code, signal });
    });
  });

  try {
    const stat = await fs.stat(snapshotPath);
    if (result.exitCode === 0 && stat.size > 0) {
      return {
        motionDetected: true,
        snapshotPath,
        snapshotFilename: filename,
      };
    }

    await fs.unlink(snapshotPath).catch(() => undefined);
    return { motionDetected: false };
  } catch (error) {
    await fs.unlink(snapshotPath).catch(() => undefined);
    return { motionDetected: false };
  }
}
