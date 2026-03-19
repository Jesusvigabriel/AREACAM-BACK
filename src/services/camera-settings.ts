export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface DailyRecordingSchedule {
  recordStart: string | null;
  recordEnd: string | null;
}

export type WeeklyRecordingSchedule = Record<DayOfWeek, DailyRecordingSchedule>;

export interface CameraScheduleSettings {
  schedule: WeeklyRecordingSchedule;
  motionEnabled: boolean;
  notifyEmail: boolean;
  motionSensitivity: number;
}

export interface PartialCameraScheduleSettings {
  schedule?: Partial<Record<DayOfWeek, Partial<DailyRecordingSchedule>>>;
  motionEnabled?: boolean;
  notifyEmail?: boolean;
  motionSensitivity?: number;
}

const KEY_SCHEDULE = 'areacam_schedule';
const KEY_MOTION_ENABLED = 'areacam_motion_enabled';
const KEY_NOTIFY_EMAIL = 'areacam_notify_email';
const KEY_MOTION_SENSITIVITY = 'areacam_motion_sensitivity';
const LEGACY_KEY_WORK_START = 'areacam_work_start';
const LEGACY_KEY_WORK_END = 'areacam_work_end';

const DAY_ORDER: DayOfWeek[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

export const WEEK_DAYS: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

function padTimeUnit(value: number): string {
  return value.toString().padStart(2, '0');
}

function sanitizeBoolean(raw: unknown, fallback: boolean): boolean {
  if (typeof raw === 'boolean') {
    return raw;
  }
  if (typeof raw === 'string') {
    const normalized = raw.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'off'].includes(normalized)) {
      return false;
    }
  }
  if (typeof raw === 'number') {
    return raw !== 0;
  }
  return fallback;
}

function sanitizeSensitivity(raw: unknown, fallback: number): number {
  let value: number | null = null;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    value = raw;
  } else if (typeof raw === 'string') {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) {
      value = parsed;
    }
  }

  if (value === null) {
    return fallback;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
}

function sanitizeTimeString(raw: unknown): string | null {
  if (typeof raw === 'string') {
    const match = raw.match(/^(\d{1,2}):(\d{1,2})$/);
    if (match) {
      const hours = Number(match[1]);
      const minutes = Number(match[2]);
      if (Number.isFinite(hours) && Number.isFinite(minutes) && hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
        return `${padTimeUnit(hours)}:${padTimeUnit(minutes)}`;
      }
    }
  }
  return null;
}

function sanitizeTimeOrNull(raw: unknown, fallback: string | null): string | null {
  if (raw === undefined) {
    return fallback;
  }
  if (raw === null) {
    return null;
  }

  const sanitized = sanitizeTimeString(raw);
  if (sanitized !== null) {
    return sanitized;
  }

  return fallback;
}

function createDefaultSchedule(): WeeklyRecordingSchedule {
  return {
    monday: { recordStart: '06:00', recordEnd: '18:00' },
    tuesday: { recordStart: '06:00', recordEnd: '18:00' },
    wednesday: { recordStart: '06:00', recordEnd: '18:00' },
    thursday: { recordStart: '06:00', recordEnd: '18:00' },
    friday: { recordStart: '06:00', recordEnd: '18:00' },
    saturday: { recordStart: '08:00', recordEnd: '14:00' },
    sunday: { recordStart: null, recordEnd: null },
  };
}

export const DEFAULT_CAMERA_SETTINGS: CameraScheduleSettings = {
  schedule: createDefaultSchedule(),
  motionEnabled: false,
  notifyEmail: false,
  motionSensitivity: 85, // Aumentado de 60 a 85 para mejor detección con OpenCV MOG2
};

function sanitizeDailySchedule(raw: unknown, fallback: DailyRecordingSchedule): DailyRecordingSchedule {
  if (!raw || typeof raw !== 'object') {
    return { ...fallback };
  }

  const data = raw as Record<string, unknown>;
  return {
    recordStart: sanitizeTimeOrNull(data.recordStart, fallback.recordStart),
    recordEnd: sanitizeTimeOrNull(data.recordEnd, fallback.recordEnd),
  };
}

function sanitizeWeeklySchedule(raw: unknown, fallback: WeeklyRecordingSchedule): WeeklyRecordingSchedule {
  const result: WeeklyRecordingSchedule = { ...fallback };

  if (!raw || typeof raw !== 'object') {
    return result;
  }

  const data = raw as Record<string, unknown>;
  for (const day of WEEK_DAYS) {
    const entry = data[day];
    result[day] = sanitizeDailySchedule(entry, fallback[day]);
  }

  return result;
}

export function readCameraSettingsFromDetails(details: Record<string, unknown> | null | undefined): CameraScheduleSettings {
  const base = details ?? {};

  const schedule = sanitizeWeeklySchedule(base[KEY_SCHEDULE], createDefaultSchedule());

  return {
    schedule,
    motionEnabled: sanitizeBoolean(base[KEY_MOTION_ENABLED], DEFAULT_CAMERA_SETTINGS.motionEnabled),
    notifyEmail: sanitizeBoolean(base[KEY_NOTIFY_EMAIL], DEFAULT_CAMERA_SETTINGS.notifyEmail),
    motionSensitivity: sanitizeSensitivity(base[KEY_MOTION_SENSITIVITY], DEFAULT_CAMERA_SETTINGS.motionSensitivity),
  };
}

export function normalizeCameraSettings(
  updates: PartialCameraScheduleSettings,
  current: CameraScheduleSettings = DEFAULT_CAMERA_SETTINGS,
): CameraScheduleSettings {
  const currentSchedule = current.schedule ?? createDefaultSchedule();
  let nextSchedule = currentSchedule;

  if (updates.schedule) {
    const merged: WeeklyRecordingSchedule = { ...currentSchedule };
    for (const day of WEEK_DAYS) {
      if (Object.prototype.hasOwnProperty.call(updates.schedule, day)) {
        const update = (updates.schedule as Record<string, unknown>)[day];
        const dailySchedule = sanitizeDailySchedule(update as Partial<DailyRecordingSchedule>, currentSchedule[day]);
        merged[day] = dailySchedule;
      }
    }
    nextSchedule = merged;
  }

  return {
    schedule: sanitizeWeeklySchedule(nextSchedule, createDefaultSchedule()),
    motionEnabled: sanitizeBoolean(updates.motionEnabled ?? current.motionEnabled, current.motionEnabled),
    notifyEmail: sanitizeBoolean(updates.notifyEmail ?? current.notifyEmail, current.notifyEmail),
    motionSensitivity: sanitizeSensitivity(updates.motionSensitivity ?? current.motionSensitivity, current.motionSensitivity),
  };
}

export function writeCameraSettingsToDetails(
  details: Record<string, unknown> | null | undefined,
  settings: CameraScheduleSettings,
): Record<string, unknown> {
  const result: Record<string, unknown> = {
    ...(details ?? {}),
  };

  result[KEY_SCHEDULE] = sanitizeWeeklySchedule(settings.schedule, createDefaultSchedule());
  result[KEY_MOTION_ENABLED] = settings.motionEnabled;
  result[KEY_NOTIFY_EMAIL] = settings.notifyEmail;
  result[KEY_MOTION_SENSITIVITY] = sanitizeSensitivity(settings.motionSensitivity, DEFAULT_CAMERA_SETTINGS.motionSensitivity);

  return result;
}

function timeStringToMinutes(value: string): number {
  const [hoursPart, minutesPart] = value.split(':');
  const hours = Number(hoursPart ?? 0);
  const minutes = Number(minutesPart ?? 0);
  return hours * 60 + minutes;
}

function getDayKey(date: Date): DayOfWeek {
  const index = date.getDay();
  return DAY_ORDER[index] ?? 'monday';
}

export function isTimeWithinSchedule(date: Date, settings: CameraScheduleSettings): boolean {
  const dayKey = getDayKey(date);
  const daily = settings.schedule[dayKey];
  if (!daily) {
    return false;
  }

  const { recordStart, recordEnd } = daily;
  if (recordStart === null || recordEnd === null) {
    return false;
  }

  if (recordStart === recordEnd) {
    return true;
  }

  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  const startMinutes = timeStringToMinutes(recordStart);
  const endMinutes = timeStringToMinutes(recordEnd);

  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

export function createEmptySchedule(): WeeklyRecordingSchedule {
  const result: WeeklyRecordingSchedule = {} as WeeklyRecordingSchedule;
  for (const day of WEEK_DAYS) {
    result[day] = { recordStart: null, recordEnd: null };
  }
  return result;
}
