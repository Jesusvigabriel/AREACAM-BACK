// @ts-ignore - Script temporal para obtener claves
const mysql = require('mysql2/promise');

async function getShinobiKeys() {
  const dbConfig = {
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'ccio',
    port: 3306,
  };

  let connection;
  try {
    console.log('Conectando a la base de datos...');
    connection = await mysql.createConnection(dbConfig);
    
    // Primero listar las tablas disponibles
    const [tables] = await connection.query("SHOW TABLES");
    console.log('Tablas disponibles:', tables);
    
    // Luego intentar con la tabla Users (diferentes casos)
    const possibleTables = ['Users', 'users', 'User', 'user'];
    
    for (const table of possibleTables) {
      try {
        const [rows] = await connection.query(`SELECT * FROM ${table} LIMIT 1`);
        console.log(`\nDatos de la tabla ${table}:`);
        console.table(rows);
        
        // Si llegamos aquí, la tabla existe, mostramos las columnas
        const [columns] = await connection.query(`SHOW COLUMNS FROM ${table}`);
        console.log(`\nColumnas de ${table}:`);
        console.table(columns);
        
        break;
      } catch (e) {
        console.log(`La tabla ${table} no existe, probando siguiente...`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (connection) await connection.end();
  }
}

getShinobiKeys().catch(console.error);
