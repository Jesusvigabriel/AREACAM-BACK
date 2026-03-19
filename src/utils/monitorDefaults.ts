interface MonitorDetailsBase {
  max_keep_days: string;
  notes: string;
  dir: string;
  rtmp_key: string;
  auto_host_enable: string;
  auto_host: string;
  rtsp_transport: string;
  muser: string;
  mpass: string;
  port_force: string;
  fatal_max: string;
  skip_ping: string | null;
  is_onvif: string | null;
  onvif_port: string;
  onvif_events: string;
  primary_input: string;
  aduration: string;
  probesize: string;
  stream_loop: string;
  sfps: string;
  accelerator: string;
  hwaccel: string;
  hwaccel_vcodec: string;
  hwaccel_device: string;
  hwaccel_format: string;
  use_coprocessor: string | null;
  stream_type: string;
  stream_flv_type: string;
  stream_flv_maxLatency: string;
  stream_mjpeg_clients: string;
  stream_vcodec: string;
  stream_acodec: string;
  hls_time: string;
  hls_list_size: string;
  preset_stream: string;
  signal_check: string;
  signal_check_log: string;
  stream_quality: string;
  stream_fps: string;
  stream_scale_x: string;
  stream_scale_y: string;
  rotate_stream: string;
  svf: string;
  tv_channel: string;
  tv_channel_id: string;
  tv_channel_group_title: string;
  stream_timestamp: string;
  stream_timestamp_font: string;
  stream_timestamp_font_size: string;
  stream_timestamp_color: string;
  stream_timestamp_box_color: string;
  stream_timestamp_x: string;
  stream_timestamp_y: string;
  stream_watermark: string;
  stream_watermark_location: string;
  stream_watermark_position: string;
  snap: string;
  snap_fps: string;
  snap_scale_x: string;
  snap_scale_y: string;
  snap_vf: string;
  vcodec: string;
  crf: string;
  acodec: string;
  record_scale_y: string;
  record_scale_x: string;
  cutoff: string;
  rotate_record: string;
  vf: string;
  timestamp: string;
  timestamp_font: string;
  timestamp_font_size: string;
  timestamp_color: string;
  timestamp_box_color: string;
  timestamp_x: string;
  timestamp_y: string;
  watermark: string;
  watermark_location: string;
  watermark_position: string;
  snapshots_dir?: string;
  detector?: string;
  detector_fps?: string;
  detector_scale_x?: string;
  detector_scale_y?: string;
  detector_lights?: string;
  detector_lite_mode?: string;
  detector_pam?: string;
  detector_use_detect_object?: string;
  detector_send_frames?: string;
  detector_http_api?: string;
  groups?: string[];
  cords?: string;
}

export type MonitorDetails = MonitorDetailsBase & Record<string, unknown>;

export interface MonitorConfig {
  mid: string;
  ke: string;
  name: string;
  type: string;
  protocol: string;
  host: string;
  port: string;
  path: string;
  ext: string;
  fps: string;
  mode: string;
  width: string;
  height: string;
  details: MonitorDetails;
}

function generateId(length = 10) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => characters.charAt(Math.floor(Math.random() * characters.length))).join('');
}

export function generateDefaultMonitor(ke: string): MonitorConfig {
  return {
    mid: generateId(),
    ke,
    name: 'New Camera',
    type: 'h264',
    protocol: 'rtsp',
    host: '',
    port: '',
    path: '/',
    ext: 'mp4',
    fps: '1',
    mode: 'start',
    width: '640',
    height: '480',
    details: {
      max_keep_days: '',
      notes: '',
      dir: '',
      rtmp_key: '',
      auto_host_enable: '1',
      auto_host: '',
      rtsp_transport: 'tcp',
      muser: '',
      mpass: '',
      port_force: '0',
      fatal_max: '0',
      skip_ping: null,
      is_onvif: null,
      onvif_port: '',
      onvif_events: '0',
      primary_input: '0',
      aduration: '1000000000',
      probesize: '1000000000',
      stream_loop: '0',
      sfps: '',
      accelerator: '0',
      hwaccel: 'auto',
      hwaccel_vcodec: '',
      hwaccel_device: '',
      hwaccel_format: '',
      use_coprocessor: null,
      stream_type: 'hls',
      stream_flv_type: 'http',
      stream_flv_maxLatency: '',
      stream_mjpeg_clients: '',
      stream_vcodec: 'copy',
      stream_acodec: 'no',
      hls_time: '2',
      hls_list_size: '3',
      preset_stream: 'ultrafast',
      signal_check: '10',
      signal_check_log: '0',
      stream_quality: '15',
      stream_fps: '2',
      stream_scale_x: '',
      stream_scale_y: '',
      rotate_stream: 'no',
      svf: '',
      tv_channel: '0',
      tv_channel_id: '',
      tv_channel_group_title: '',
      stream_timestamp: '0',
      stream_timestamp_font: '',
      stream_timestamp_font_size: '',
      stream_timestamp_color: '',
      stream_timestamp_box_color: '',
      stream_timestamp_x: '',
      stream_timestamp_y: '',
      stream_watermark: '0',
      stream_watermark_location: '',
      stream_watermark_position: 'tr',
      snap: '0',
      snap_fps: '',
      snap_scale_x: '',
      snap_scale_y: '',
      snap_vf: '',
      vcodec: 'copy',
      crf: '1',
      acodec: 'no',
      record_scale_y: '',
      record_scale_x: '',
      cutoff: '15',
      rotate_record: 'no',
      vf: '',
      timestamp: '0',
      timestamp_font: '',
      timestamp_font_size: '10',
      timestamp_color: 'white',
      timestamp_box_color: '0x00000000@1',
      timestamp_x: '(w-tw)/2',
      timestamp_y: '0',
      watermark: '0',
      watermark_location: '',
      watermark_position: 'tr',
    },
  };
}

export function applyCameraUrl(config: MonitorConfig, url: URL, credentials?: { user?: string; password?: string }) {
  config.protocol = url.protocol.replace(':', '') || 'rtsp';
  config.host = url.hostname;
  config.port = url.port || '554';
  config.path = `${url.pathname}${url.search}` || '/';
  
  // Extraer credenciales de la URL si existen
  if (url.username) {
    config.details.muser = decodeURIComponent(url.username);
  }
  if (url.password) {
    config.details.mpass = decodeURIComponent(url.password);
  }
  
  // Sobrescribir con credenciales explícitas si se proporcionan
  if (credentials?.user) {
    config.details.muser = credentials.user;
  }
  if (credentials?.password) {
    config.details.mpass = credentials.password;
  }
  
  config.details.auto_host_enable = '1';
  config.details.auto_host = url.toString();
}

export function sanitizeMonitorId(name: string): string {
  return name.replace(/[^\w\s]/g, '').replace(/\s+/g, '').slice(0, 20) || generateId();
}
