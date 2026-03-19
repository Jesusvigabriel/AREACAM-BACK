const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// URL RTSP de TOKIO-01
const RTSP_URL = 'rtsp://admin:Tokio2024@192.168.1.11:554/Streaming/Channels/101';
const OUTPUT_DIR = path.join(__dirname, '../storage/motion-events');
const OUTPUT_FILE = path.join(OUTPUT_DIR, `test-tokio1-${Date.now()}.jpg`);

// Crear directorio si no existe
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log('🔍 Probando detección de movimiento en CAM-TOKIO-01...');
console.log(`📹 RTSP: ${RTSP_URL}`);
console.log(`💾 Salida: ${OUTPUT_FILE}`);
console.log('');

// Probar con diferentes umbrales
const thresholds = [0.15, 0.10, 0.08, 0.05, 0.03];

async function testThreshold(threshold) {
  return new Promise((resolve) => {
    console.log(`\n🧪 Probando umbral: ${threshold}`);
    
    const args = [
      '-hide_banner',
      '-loglevel', 'info',
      '-rtsp_transport', 'tcp',
      '-i', RTSP_URL,
      '-t', '4',
      '-vf', `scale=640:360,eq=brightness=0.05:contrast=1.2,unsharp=3:3:1.5,select=gt(scene\\,${threshold}),metadata=print:file=-:key=lavfi.scene_score`,
      '-frames:v', '1',
      '-vsync', 'vfr',
      '-y',
      OUTPUT_FILE + `.${threshold}.jpg`
    ];

    const child = spawn('ffmpeg', args);
    let output = '';

    child.stderr.on('data', (data) => {
      output += data.toString();
    });

    child.on('close', (code) => {
      const outputFile = OUTPUT_FILE + `.${threshold}.jpg`;
      const exists = fs.existsSync(outputFile);
      const size = exists ? fs.statSync(outputFile).size : 0;
      
      console.log(`   Código salida: ${code}`);
      console.log(`   Archivo creado: ${exists ? 'Sí' : 'No'}`);
      console.log(`   Tamaño: ${size} bytes`);
      
      if (exists && size > 0) {
        console.log(`   ✅ MOVIMIENTO DETECTADO con umbral ${threshold}`);
      } else {
        console.log(`   ❌ Sin movimiento con umbral ${threshold}`);
      }

      resolve({ threshold, detected: exists && size > 0, code, size });
    });
  });
}

async function runTests() {
  console.log('⏳ Ejecutando pruebas con diferentes umbrales...');
  
  const results = [];
  for (const threshold of thresholds) {
    const result = await testThreshold(threshold);
    results.push(result);
  }

  console.log('\n\n📊 RESUMEN DE RESULTADOS:');
  console.log('═══════════════════════════════════════');
  results.forEach(r => {
    const status = r.detected ? '✅ DETECTADO' : '❌ NO DETECTADO';
    console.log(`Umbral ${r.threshold}: ${status} (${r.size} bytes)`);
  });

  const detected = results.filter(r => r.detected);
  if (detected.length > 0) {
    console.log(`\n✅ Movimiento detectado con ${detected.length}/${results.length} umbrales`);
    console.log(`💡 Umbral recomendado: ${detected[detected.length - 1].threshold}`);
  } else {
    console.log('\n❌ NO se detectó movimiento con ningún umbral');
    console.log('💡 Posibles causas:');
    console.log('   - No hay movimiento en este momento');
    console.log('   - La persona está quieta');
    console.log('   - Problema de conexión RTSP');
  }
}

runTests().catch(console.error);
