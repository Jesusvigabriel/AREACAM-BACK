const mysql = require('mysql2/promise');
require('dotenv').config();

async function enableMotionForTokio1() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    // Obtener la cámara Tokio 1
    const [rows] = await connection.execute(
      'SELECT mid, name, details FROM Monitors WHERE name LIKE ? LIMIT 1',
      ['%TOKIO-01%']
    );

    if (rows.length === 0) {
      console.log('❌ No se encontró la cámara TOKIO-01');
      return;
    }

    const camera = rows[0];
    console.log(`✅ Cámara encontrada: ${camera.name} (${camera.mid})`);

    // Parsear details
    let details = {};
    try {
      details = typeof camera.details === 'string' ? JSON.parse(camera.details) : camera.details;
    } catch (e) {
      console.log('⚠️  Details vacío, creando nuevo objeto');
    }

    // Configurar detección de movimiento
    details.areacam_motion_enabled = true;
    details.areacam_notify_email = true;
    details.areacam_motion_sensitivity = 60;

    // Configurar horarios (Lunes a Viernes 06:00-18:00)
    details.areacam_schedule = {
      monday: { recordStart: '06:00', recordEnd: '18:00' },
      tuesday: { recordStart: '06:00', recordEnd: '18:00' },
      wednesday: { recordStart: '06:00', recordEnd: '18:00' },
      thursday: { recordStart: '06:00', recordEnd: '18:00' },
      friday: { recordStart: '06:00', recordEnd: '18:00' },
      saturday: { recordStart: '08:00', recordEnd: '14:00' },
      sunday: { recordStart: null, recordEnd: null }
    };

    // Actualizar en la base de datos
    await connection.execute(
      'UPDATE Monitors SET details = ? WHERE mid = ?',
      [JSON.stringify(details), camera.mid]
    );

    console.log('✅ Configuración actualizada:');
    console.log('   - Detección de movimiento: HABILITADA');
    console.log('   - Notificaciones email: HABILITADAS');
    console.log('   - Sensibilidad: 60%');
    console.log('   - Horarios: Lun-Vie 06:00-18:00, Sáb 08:00-14:00, Dom: sin grabación');
    console.log('\n🔄 Reinicia el backend para aplicar cambios: pm2 restart areacam-backend');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.end();
  }
}

enableMotionForTokio1();
