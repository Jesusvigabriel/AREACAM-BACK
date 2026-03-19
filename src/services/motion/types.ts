export type MotionEventSource = 'stream' | 'manual' | 'api' | string;

export interface MotionEvent {
  cameraId: string;
  groupKey?: string;
  source: MotionEventSource;
  timestamp: Date;
  snapshotUrl?: string;
  clipUrl?: string;
  payload?: Record<string, unknown>;
}
