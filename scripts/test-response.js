// @ts-ignore
const mysql = require('mysql2/promise');

async function testMonitorsResponse() {
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

    // Simular la consulta que hace el endpoint de monitores
    const [rows] = await connection.query(
      'SELECT mid, ke, name, type, protocol, host, port, path, mode, ext, fps, width, height, details FROM Monitors WHERE ke = ? LIMIT 10',
      ['63aaObjyC9']
    );

    console.log('Respuesta simulada del endpoint GET /monitors:');
    console.log(JSON.stringify({
      ok: true,
      data: rows.map(row => {
        // Configuración de Shinobi
        const SHINOBI_HOST = 'http://localhost:8080';
        const SHINOBI_API_KEY = 'Tu_Passw0rd!23';

        // Construir las URLs de los streams
        const basePath = `${SHINOBI_HOST}/${row.ke}/${row.mid}`;
        const authParam = `?auth=${SHINOBI_API_KEY}`;

        return {
          mid: row.mid,
          ke: row.ke,
          name: row.name,
          type: row.type,
          protocol: row.protocol,
          host: row.host,
          port: row.port,
          path: row.path,
          mode: row.mode,
          ext: row.ext,
          fps: row.fps,
          width: row.width,
          height: row.height,
          details: row.details ? JSON.parse(row.details) : null,
          streams: {
            hls: `${basePath}/hls/monitor.m3u8${authParam}`,
            mjpeg: `${basePath}/mjpeg.jpg${authParam}`,
            flv: `${basePath}/flv${authParam}`
          }
        };
      })
    }, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

testMonitorsResponse();
