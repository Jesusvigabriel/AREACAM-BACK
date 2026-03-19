// @ts-ignore
const mysql = require('mysql2/promise');

async function testNewEndpoints() {
  const dbConfig = {
    host: '127.0.0.1',
    user: 'majesticflame',
    password: 'Tu_Passw0rd!23',
    database: 'ccio',
    port: 3306
  };

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);

    console.log('=== PRUEBA DE ENDPOINTS ===\n');

    // Simular GET /monitors/active
    console.log('1. GET /monitors/active (Lista ligera para selección):');
    const [activeRows] = await connection.query(
      'SELECT mid, name, type, host, port FROM Monitors WHERE ke = ? ORDER BY name',
      ['63aaObjyC9']
    );

    const activeMonitors = activeRows.map(row => ({
      mid: row.mid,
      name: row.name,
      type: row.type,
      host: row.host,
      port: row.port,
    }));

    console.log(JSON.stringify({ ok: true, data: activeMonitors }, null, 2));

    if (activeRows.length > 0) {
      const firstMonitor = activeRows[0];

      console.log('\n2. GET /monitors/' + firstMonitor.mid + '/streams (URLs para streaming):');

      // Configuración de Shinobi
      const SHINOBI_HOST = 'http://localhost:8080';
      const SHINOBI_API_KEY = 'Tu_Passw0rd!23';

      const basePath = `${SHINOBI_HOST}/${firstMonitor.ke}/${firstMonitor.mid}`;
      const authParam = `?auth=${SHINOBI_API_KEY}`;

      const streams = {
        hls: `${basePath}/hls/monitor.m3u8${authParam}`,
        mjpeg: `${basePath}/mjpeg.jpg${authParam}`,
        flv: `${basePath}/flv${authParam}`
      };

      console.log(JSON.stringify({
        ok: true,
        data: {
          mid: firstMonitor.mid,
          name: firstMonitor.name,
          streams: streams
        }
      }, null, 2));
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

testNewEndpoints();
