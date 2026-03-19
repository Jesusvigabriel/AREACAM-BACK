const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// URL RTSP de TOKIO-01
const RTSP_URL = 'rtsp://admin:Tokio2024@192.168.1.11:554/Streaming/Channels/101';
const OUTPUT_DIR = path.join(__dirname, '../storage/motion-events');
const OUTPUT_FILE = path.join(OUTPUT_DIR, `snapshot-tokio1-${Date.now()}.jpg`);

// Crear directorio si no existe
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log('📸 Capturando imagen actual de CAM-TOKIO-01...');
console.log(`📹 RTSP: ${RTSP_URL}`);
console.log(`💾 Salida: ${OUTPUT_FILE}`);
console.log('');

const args = [
  '-hide_banner',
  '-loglevel', 'error',
  '-rtsp_transport', 'tcp',
  '-i', RTSP_URL,
  '-frames:v', '1',
  '-y',
  OUTPUT_FILE
];

const child = spawn('ffmpeg', args);

child.on('close', (code) => {
  if (code === 0 && fs.existsSync(OUTPUT_FILE)) {
    const size = fs.statSync(OUTPUT_FILE).size;
    console.log(`✅ Imagen capturada exitosamente`);
    console.log(`📁 Archivo: ${OUTPUT_FILE}`);
    console.log(`📏 Tamaño: ${(size / 1024).toFixed(2)} KB`);
    console.log('');
    console.log('💡 Abre esta imagen para ver el estado actual de la cámara');
  } else {
    console.log('❌ Error al capturar imagen');
  }
});
