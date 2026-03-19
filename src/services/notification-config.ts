import fs from 'fs/promises';
import path from 'path';

export interface MotionEmailTemplate {
  subject: string;
  html: string;
}

export interface MotionEmailSettings {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
  fromName: string;
  fromEmail: string;
  template: MotionEmailTemplate;
  defaultRecipients: string[];
}

export interface MotionEmailConfig {
  enabled: boolean;
  settings: MotionEmailSettings;
}

const DEFAULT_CONFIG: MotionEmailConfig = {
  enabled: false,
  settings: {
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: '',
    smtpPassword: '',
    fromName: 'AreaCam',
    fromEmail: 'no-reply@areacam.local',
    template: {
      subject: 'Alerta de movimiento en {{camera_name}}',
      html:
        '<p>Se detectó movimiento en la cámara <strong>{{camera_name}}</strong> a las {{timestamp}}.</p>' +
        '<p><a href="{{snapshot_url}}">Ver captura</a> | <a href="{{clip_url}}">Descargar clip</a></p>',
    },
    defaultRecipients: [],
  },
};

const CONFIG_PATH = process.env.NOTIFICATIONS_CONFIG_PATH ||
  path.join(process.cwd(), 'storage', 'notifications-email.json');

async function ensureFolderExists(configPath: string): Promise<void> {
  const dir = path.dirname(configPath);
  await fs.mkdir(dir, { recursive: true });
}

export async function readMotionEmailConfig(): Promise<MotionEmailConfig> {
  try {
    const raw = await fs.readFile(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw) as MotionEmailConfig;

    return {
      enabled: parsed.enabled ?? DEFAULT_CONFIG.enabled,
      settings: {
        ...DEFAULT_CONFIG.settings,
        ...(parsed.settings ?? {}),
        template: {
          ...DEFAULT_CONFIG.settings.template,
          ...(parsed.settings?.template ?? {}),
        },
        defaultRecipients: parsed.settings?.defaultRecipients ?? [],
      },
    };
  } catch (error) {
    return DEFAULT_CONFIG;
  }
}

export async function writeMotionEmailConfig(config: MotionEmailConfig): Promise<void> {
  await ensureFolderExists(CONFIG_PATH);
  const payload = JSON.stringify(config, null, 2);
  await fs.writeFile(CONFIG_PATH, payload, 'utf8');
}

export function mergeMotionEmailConfig(
  current: MotionEmailConfig,
  updates: Partial<MotionEmailConfig>,
): MotionEmailConfig {
  const merged: MotionEmailConfig = {
    enabled: updates.enabled ?? current.enabled,
    settings: {
      ...current.settings,
      ...(updates.settings ?? {}),
      template: {
        ...current.settings.template,
        ...(updates.settings?.template ?? {}),
      },
      defaultRecipients:
        updates.settings?.defaultRecipients ?? current.settings.defaultRecipients,
    },
  };

  return merged;
}
