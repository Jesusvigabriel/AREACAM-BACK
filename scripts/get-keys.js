const mysql = require('mysql2/promise');

// Configuración de la base de datos
const dbConfig = {
  host: '127.0.0.1',
  user: 'majesticflame',
  password: 'Tu_Passw0rd!23',
  database: 'ccio',
  port: 3306
};

async function getShinobiKeys() {
  console.log('Conectando a la base de datos con la siguiente configuración:');
  console.log('- Host:', dbConfig.host);
  console.log('- Usuario:', dbConfig.user);
  console.log('- Base de datos:', dbConfig.database);
  console.log('- Puerto:', dbConfig.port);

  let connection;
  try {
    // Crear conexión
    connection = await mysql.createConnection(dbConfig);
    
    // Primero, listar las tablas para verificar la estructura
    const [tables] = await connection.query('SHOW TABLES');
    console.log('\nTablas en la base de datos:');
    console.table(tables);
    
    // Verificar la estructura de la tabla Users
    const [columns] = await connection.query('DESCRIBE Users');
    console.log('\nEstructura de la tabla Users:');
    console.table(columns);
    
    // Consulta para obtener usuarios con sus API keys
    const [rows] = await connection.query(
      'SELECT * FROM Users LIMIT 10'
    );

    console.log('\nUsuarios encontrados:');
    if (rows.length === 0) {
      console.log('No se encontraron usuarios en la base de datos.');
    } else {
      console.table(rows);
      
      // Mostrar la primera API key encontrada (si existe)
      const userWithApiKey = rows.find(u => u.api_key);
      if (userWithApiKey) {
        console.log('\nAPI Key encontrada:');
        console.log('- Usuario:', userWithApiKey.email);
        console.log('- API Key:', userWithApiKey.api_key);
        console.log('- UID:', userWithApiKey.uid);
      } else {
        console.log('\nNo se encontraron usuarios con API key.');
      }
    }
    
    return rows;
  } catch (error) {
    console.error('\nError al conectar a la base de datos:');
    console.error('- Código:', error.code || 'N/A');
    console.error('- Mensaje:', error.message);
    
    // Mostrar sugerencias de solución
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\nPosibles soluciones:');
      console.error('1. Verifica que el usuario y contraseña sean correctos');
      console.error('2. Asegúrate de que el usuario tenga permisos para acceder a la base de datos');
      console.error('3. Verifica que la base de datos exista y esté accesible');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\nNo se pudo conectar al servidor de base de datos.');
      console.error('Asegúrate de que MySQL esté en ejecución y escuchando en el puerto correcto.');
    }
    
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Ejecutar la función
getShinobiKeys()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
