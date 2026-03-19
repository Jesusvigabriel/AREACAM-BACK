import pool from '../../db';
import type { RowDataPacket } from 'mysql2/promise';
import { readCameraSettingsFromDetails, type CameraScheduleSettings } from '../camera-settings';

interface MonitorRow extends RowDataPacket {
  mid: string;
  ke: string;
  name: string;
  protocol: string | null;
  host: string | null;
  port: string | null;
  path: string | null;
  details: string | Record<string, unknown> | null;
}

export interface MotionMonitorInfo {
  mid: string;
  name: string;
  groupKey: string;
  details: Record<string, unknown> | null;
  protocol: string;
  host: string;
  port: string;
  path: string;
  rtspUrl: string;
  hlsUrl: string;
  settings: CameraScheduleSettings;
}

function parseMonitorDetails(details: unknown): Record<string, unknown> | null {
  if (!details) {
    return null;
  }

  if (typeof details === 'string') {
    try {
      const parsed = JSON.parse(details);
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, unknown>;
      }
    } catch (error) {
      console.warn('[motion] No se pudo parsear detalles de monitor', error);
      return null;
    }
    return null;
  }

  if (typeof details === 'object') {
    return { ...(details as Record<string, unknown>) };
  }

  return null;
}

export async function fetchMonitorByGroupAndId(groupKey: string | undefined, mid: string): Promise<MotionMonitorInfo | null> {
  if (!mid) {
    return null;
  }

  const query = groupKey
    ? 'SELECT mid, ke, name, protocol, host, port, path, details FROM Monitors WHERE ke = ? AND mid = ? LIMIT 1'
    : 'SELECT mid, ke, name, protocol, host, port, path, details FROM Monitors WHERE mid = ? LIMIT 1';

  const params = groupKey ? [groupKey, mid] : [mid];
  const [rows] = await pool.execute<MonitorRow[]>(query, params);

  const row = rows[0];
  if (!row) {
    return null;
  }

  const details = parseMonitorDetails(row.details);
  const protocol = String(row.protocol ?? 'rtsp');
  const host = String(row.host ?? '');
  const port = String(row.port ?? '554');
  const cameraPath = String(row.path ?? '/');
  const settings = readCameraSettingsFromDetails(details);

  const rawUser = details?.muser;
  const rawPass = details?.mpass;
  const username = typeof rawUser === 'string' ? rawUser : '';
  const password = typeof rawPass === 'string' ? rawPass : '';

  // URL RTSP original de la cámara (para referencia)
  let rtspUrlOriginal = `${protocol}://`;
  if (username && password) {
    rtspUrlOriginal += `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`;
  }
  rtspUrlOriginal += `${host}:${port}${cameraPath}`;

  // Construir URLs de MediaMTX (más confiables y rápidas)
  const HLS_BASE_URL = process.env.HLS_BASE_URL || 'http://localhost:8888';
  const RTSP_BASE_URL = process.env.RTSP_BASE_URL || 'rtsp://localhost:8554';
  const hlsUrl = `${HLS_BASE_URL}/${row.mid}/index.m3u8`;
  const rtspUrl = `${RTSP_BASE_URL}/${row.mid}`;

  return {
    mid: String(row.mid ?? ''),
    name: String(row.name ?? ''),
    groupKey: String(row.ke ?? ''),
    details,
    protocol,
    host,
    port,
    path: cameraPath,
    rtspUrl,
    hlsUrl,
    settings,
  };
}
