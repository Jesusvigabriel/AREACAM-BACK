const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTokio1RTSP() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'majesticflame',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ccio'
  });

  try {
    const [rows] = await connection.execute(
      'SELECT mid, name, host, port, path, protocol, details FROM Monitors WHERE mid = ? AND ke = ?',
      ['PNJc1xZJIV', '63aaObjyC9']
    );

    if (rows.length === 0) {
      console.log('❌ Cámara TOKIO-01 no encontrada');
      return;
    }

    const monitor = rows[0];
    console.log('📹 Información de CAM-TOKIO-01:');
    console.log('═══════════════════════════════════════');
    console.log(`Nombre: ${monitor.name}`);
    console.log(`Host: ${monitor.host}`);
    console.log(`Puerto: ${monitor.port}`);
    console.log(`Path: ${monitor.path}`);
    console.log(`Protocolo: ${monitor.protocol}`);
    console.log('');

    // Parsear details
    let details = {};
    try {
      details = JSON.parse(monitor.details || '{}');
    } catch (e) {
      console.log('⚠️  Details no es JSON válido');
    }

    // Construir URL RTSP
    const rtspUrl = `rtsp://${monitor.host}:${monitor.port}${monitor.path}`;
    console.log(`🔗 URL RTSP construida: ${rtspUrl}`);
    console.log('');

    // Verificar configuración de detección
    console.log('⚙️  Configuración de detección:');
    console.log(`   - Detección habilitada: ${details.areacam_motion_enabled ? 'Sí' : 'No'}`);
    console.log(`   - Notificar por email: ${details.areacam_notify_email ? 'Sí' : 'No'}`);
    console.log(`   - Sensibilidad: ${details.areacam_motion_sensitivity || 'no configurado'}%`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

checkTokio1RTSP();
