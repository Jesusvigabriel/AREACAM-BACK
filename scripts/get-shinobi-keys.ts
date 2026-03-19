const mysql = require('mysql2/promise');
const { getShinobiDbConfig } = require('../src/config/shinobi');

async function getShinobiKeys() {
  // Obtener configuración de la base de datos
  const dbConfig = getShinobiDbConfig();
  
  console.log('Conectando a la base de datos con la siguiente configuración:');
  console.log(`- Host: ${dbConfig.host}`);
  console.log(`- Usuario: ${dbConfig.user}`);
  console.log(`- Base de datos: ${dbConfig.database}`);
  console.log(`- Puerto: ${dbConfig.port}`);

  let connection;
  try {
    // Crear conexión
    connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      port: dbConfig.port
    });
    
    // Consulta para obtener usuarios con sus API keys
    const [rows] = await connection.query(
      'SELECT uid, email, auth_token, api_key FROM Users LIMIT 10'
    );

    console.log('\nUsuarios encontrados:');
    if (rows.length === 0) {
      console.log('No se encontraron usuarios en la base de datos.');
    } else {
      console.table(rows);
    }
    
    return rows;
  } catch (error) {
    console.error('\nError al conectar a la base de datos:');
    console.error(`- Código: ${error.code || 'N/A'}`);
    console.error(`- Mensaje: ${error.message}`);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  getShinobiKeys()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error en la ejecución:', error);
      process.exit(1);
    });
}

module.exports = { getShinobiKeys };
