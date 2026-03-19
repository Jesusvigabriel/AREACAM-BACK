import nodemailer from 'nodemailer';
import Handlebars from 'handlebars';
import type { Transporter } from 'nodemailer';
import {
  readMotionEmailConfig,
  type MotionEmailConfig,
  type MotionEmailSettings,
} from './notification-config';

interface MotionNotificationTemplateData {
  camera_id: string;
  camera_name: string;
  timestamp: string;
  snapshot_url?: string;
  clip_url?: string;
  [key: string]: unknown;
}

export interface MotionNotificationPayload {
  cameraId: string;
  cameraName: string;
  timestamp: Date;
  snapshotUrl?: string;
  clipUrl?: string;
  recipients?: string[];
  extraData?: Record<string, unknown>;
  attachments?: MotionEmailAttachment[];
}

export interface MotionNotificationResult {
  status: 'sent' | 'skipped';
  reason?: string;
}

export interface MotionEmailAttachment {
  filename: string;
  path: string;
  cid?: string;
}

interface CachedTransporter {
  key: string;
  transporter: Transporter;
}

let cachedTransporter: CachedTransporter | null = null;

function buildTransportKey(settings: MotionEmailSettings): string {
  return JSON.stringify({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpSecure,
    user: settings.smtpUser,
  });
}

function normalizeRecipients(recipients: string[] | undefined): string[] {
  if (!recipients?.length) {
    return [];
  }

  return recipients
    .map((recipient) => recipient.trim())
    .filter((recipient) => recipient.length > 0);
}

function compileTemplate(source: string, data: MotionNotificationTemplateData): string {
  try {
    const template = Handlebars.compile(source);
    return template(data);
  } catch (error) {
    console.warn('[motion-email] Error compilando plantilla, usando valor original:', error);
    return source;
  }
}

async function getTransporter(config: MotionEmailConfig): Promise<Transporter> {
  const { settings } = config;
  const key = buildTransportKey(settings);

  if (cachedTransporter?.key === key) {
    return cachedTransporter.transporter;
  }

  const transporter = nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpSecure,
    auth: settings.smtpUser
      ? {
          user: settings.smtpUser,
          pass: settings.smtpPassword,
        }
      : undefined,
  });

  cachedTransporter = { key, transporter };
  return transporter;
}

function buildTemplateData(payload: MotionNotificationPayload): MotionNotificationTemplateData {
  const data: MotionNotificationTemplateData = {
    camera_id: payload.cameraId,
    camera_name: payload.cameraName,
    timestamp: payload.timestamp.toISOString(),
    ...(payload.extraData ?? {}),
  };

  if (payload.snapshotUrl) {
    data.snapshot_url = payload.snapshotUrl;
  }
  if (payload.clipUrl) {
    data.clip_url = payload.clipUrl;
  }

  return data;
}

function formatFrom(settings: MotionEmailSettings): string {
  const name = settings.fromName?.trim() || 'AreaCam';
  const email = settings.fromEmail?.trim() || 'no-reply@areacam.local';
  return `${name} <${email}>`;
}

export async function sendMotionNotification(
  payload: MotionNotificationPayload,
): Promise<MotionNotificationResult> {
  const config = await readMotionEmailConfig();

  if (!config.enabled) {
    return { status: 'skipped', reason: 'notifications_disabled' };
  }

  const recipients = normalizeRecipients(payload.recipients ?? config.settings.defaultRecipients);
  if (!recipients.length) {
    return { status: 'skipped', reason: 'no_recipients' };
  }

  const settings = config.settings;
  if (!settings.smtpHost) {
    return { status: 'skipped', reason: 'smtp_not_configured' };
  }

  const templateData = buildTemplateData(payload);
  const subject = compileTemplate(settings.template.subject, templateData);
  const html = compileTemplate(settings.template.html, templateData);

  try {
    const transporter = await getTransporter(config);

    await transporter.sendMail({
      from: formatFrom(settings),
      to: recipients,
      subject,
      html,
      attachments: payload.attachments?.map((attachment) => ({
        filename: attachment.filename,
        path: attachment.path,
        cid: attachment.cid,
      })),
    });

    return { status: 'sent' };
  } catch (error) {
    console.error('[motion-email] Error enviando correo de movimiento:', error);
    return { status: 'skipped', reason: 'send_failed' };
  }
}

export function invalidateMotionEmailTransport(): void {
  cachedTransporter = null;
}
