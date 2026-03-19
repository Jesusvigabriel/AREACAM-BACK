const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateTokio1Sensitivity() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'majesticflame',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ccio'
  });

  try {
    // Obtener la configuración actual
    const [rows] = await connection.execute(
      'SELECT mid, name, details FROM Monitors WHERE mid = ? AND ke = ?',
      ['PNJc1xZJIV', '63aaObjyC9']
    );

    if (rows.length === 0) {
      console.log('❌ Cámara TOKIO-01 no encontrada');
      return;
    }

    const monitor = rows[0];
    console.log(`📹 Cámara encontrada: ${monitor.name}`);

    // Parsear details
    let details = {};
    try {
      details = JSON.parse(monitor.details || '{}');
    } catch (e) {
      console.log('⚠️  Details no es JSON válido, creando nuevo objeto');
    }

    // Actualizar sensibilidad
    const oldSensitivity = details.areacam_motion_sensitivity || 'no configurado';
    details.areacam_motion_sensitivity = 70;

    console.log(`🔧 Actualizando sensibilidad: ${oldSensitivity} → 70`);

    // Guardar en DB
    await connection.execute(
      'UPDATE Monitors SET details = ? WHERE mid = ? AND ke = ?',
      [JSON.stringify(details), 'PNJc1xZJIV', '63aaObjyC9']
    );

    console.log('✅ Sensibilidad actualizada correctamente');
    console.log('');
    console.log('📊 Configuración actual:');
    console.log(`   - Detección habilitada: ${details.areacam_motion_enabled ? 'Sí' : 'No'}`);
    console.log(`   - Notificar por email: ${details.areacam_notify_email ? 'Sí' : 'No'}`);
    console.log(`   - Sensibilidad: ${details.areacam_motion_sensitivity}%`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

updateTokio1Sensitivity();
