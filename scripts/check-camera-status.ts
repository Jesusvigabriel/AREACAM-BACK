import pool from '../src/db';
import type { RowDataPacket } from 'mysql2/promise';

async function checkCameraStatus() {
  try {
    console.log('🔍 Verificando estado de cámaras LONDRES...\n');

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT mid, name, mode, host, port, path, protocol 
       FROM Monitors 
       WHERE name LIKE '%LONDRES%' 
       ORDER BY name ASC`
    );

    if (rows.length === 0) {
      console.log('❌ No se encontraron cámaras con "LONDRES" en el nombre');
      return;
    }

    console.log(`✅ Encontradas ${rows.length} cámaras:\n`);

    for (const row of rows) {
      console.log(`📹 ${row.name}`);
      console.log(`   ID: ${row.mid}`);
      console.log(`   Modo: ${row.mode || 'N/A'}`);
      console.log(`   Host: ${row.host}`);
      console.log(`   Puerto: ${row.port || 'N/A'}`);
      console.log(`   Path: ${row.path || 'N/A'}`);
      console.log(`   Protocolo: ${row.protocol || 'N/A'}`);
      console.log('');
    }

    // Verificar todas las cámaras disponibles
    const [allCameras] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM Monitors`
    );
    
    console.log(`\n📊 Total de cámaras en la base de datos: ${allCameras[0]?.total || 0}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkCameraStatus();
