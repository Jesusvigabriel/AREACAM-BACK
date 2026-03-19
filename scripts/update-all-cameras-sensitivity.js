const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateAllCamerasSensitivity() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'majesticflame',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ccio'
  });

  try {
    // Obtener todas las cámaras con detección habilitada
    const [rows] = await connection.execute(
      `SELECT mid, name, details FROM Monitors WHERE ke = '63aaObjyC9'`
    );

    console.log(`📹 Encontradas ${rows.length} cámaras`);
    console.log('');

    let updated = 0;
    for (const monitor of rows) {
      let details = {};
      try {
        details = JSON.parse(monitor.details || '{}');
      } catch (e) {
        continue;
      }

      // Solo actualizar si tiene detección habilitada
      if (details.areacam_motion_enabled && details.areacam_notify_email) {
        const oldSens = details.areacam_motion_sensitivity || 60;
        details.areacam_motion_sensitivity = 85;

        await connection.execute(
          'UPDATE Monitors SET details = ? WHERE mid = ? AND ke = ?',
          [JSON.stringify(details), monitor.mid, '63aaObjyC9']
        );

        console.log(`✅ ${monitor.name}: ${oldSens} → 85`);
        updated++;
      }
    }

    console.log('');
    console.log(`📊 Resumen: ${updated} cámaras actualizadas`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

updateAllCamerasSensitivity();
