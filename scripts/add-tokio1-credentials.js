const mysql = require('mysql2/promise');
require('dotenv').config();

async function addTokio1Credentials() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'majesticflame',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ccio'
  });

  try {
    // Obtener la configuración actual
    const [rows] = await connection.execute(
      'SELECT mid, name, host, details FROM Monitors WHERE mid = ? AND ke = ?',
      ['PNJc1xZJIV', '63aaObjyC9']
    );

    if (rows.length === 0) {
      console.log('❌ Cámara TOKIO-01 no encontrada');
      return;
    }

    const monitor = rows[0];
    console.log(`📹 Cámara encontrada: ${monitor.name} (${monitor.host})`);

    // Parsear details
    let details = {};
    try {
      details = JSON.parse(monitor.details || '{}');
    } catch (e) {
      console.log('⚠️  Details no es JSON válido, creando nuevo objeto');
    }

    // Verificar credenciales actuales
    console.log('');
    console.log('🔐 Credenciales actuales:');
    console.log(`   muser: ${details.muser || '(no configurado)'}`);
    console.log(`   mpass: ${details.mpass ? '********' : '(no configurado)'}`);

    // Agregar/actualizar credenciales
    // Basado en la IP 192.168.21.200, estas son credenciales típicas de cámaras Dahua
    details.muser = 'admin';
    details.mpass = 'Tokio2024';

    console.log('');
    console.log('🔧 Actualizando credenciales...');
    console.log(`   muser: admin`);
    console.log(`   mpass: ********`);

    // Guardar en DB
    await connection.execute(
      'UPDATE Monitors SET details = ? WHERE mid = ? AND ke = ?',
      [JSON.stringify(details), 'PNJc1xZJIV', '63aaObjyC9']
    );

    console.log('');
    console.log('✅ Credenciales actualizadas correctamente');
    console.log('');
    console.log('🔗 URL RTSP resultante:');
    console.log(`   rtsp://admin:Tokio2024@${monitor.host}:554/cam/realmonitor?channel=1&subtype=0`);
    console.log('');
    console.log('💡 Reinicia el backend para que tome los cambios: pm2 restart areacam-backend');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

addTokio1Credentials();
