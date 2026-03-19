const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixTokio1Password() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'majesticflame',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ccio'
  });

  try {
    const [rows] = await connection.execute(
      'SELECT mid, name, details FROM Monitors WHERE mid = ? AND ke = ?',
      ['PNJc1xZJIV', '63aaObjyC9']
    );

    if (rows.length === 0) {
      console.log('❌ Cámara TOKIO-01 no encontrada');
      return;
    }

    const monitor = rows[0];
    console.log(`📹 Cámara: ${monitor.name}`);

    let details = {};
    try {
      details = JSON.parse(monitor.details || '{}');
    } catch (e) {
      console.log('⚠️  Details no es JSON válido, creando nuevo objeto');
    }

    // Actualizar con la contraseña correcta
    details.muser = 'admin';
    details.mpass = 'Alfahc2021';

    console.log('🔧 Actualizando credenciales a admin:Alfahc2021...');

    await connection.execute(
      'UPDATE Monitors SET details = ? WHERE mid = ? AND ke = ?',
      [JSON.stringify(details), 'PNJc1xZJIV', '63aaObjyC9']
    );

    console.log('✅ Credenciales actualizadas correctamente');
    console.log('');
    console.log('🔗 URL RTSP: rtsp://admin:Alfahc2021@192.168.21.200:554/cam/realmonitor?channel=1&subtype=0');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

fixTokio1Password();
