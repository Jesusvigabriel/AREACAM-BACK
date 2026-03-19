import pool from '../src/db';
import type { RowDataPacket } from 'mysql2/promise';
import crypto from 'crypto';

async function checkUser() {
  try {
    const email = 'vgarcia@area54sa.com.ar';
    console.log(`🔍 Buscando usuario: ${email}\n`);

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT uid, ke, mail, pass, details FROM Users WHERE mail = ?`,
      [email]
    );

    if (rows.length === 0) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    const user = rows[0];
    console.log('✅ Usuario encontrado:');
    console.log(`   UID: ${user.uid}`);
    console.log(`   KE (groupKey): ${user.ke}`);
    console.log(`   Email: ${user.mail}`);
    console.log(`   Pass (hash): ${user.pass}`);
    console.log(`   Details: ${user.details || 'null'}`);
    
    // Probar diferentes hashes
    const password = 'Temporal.2025';
    console.log('\n🔐 Probando hashes:');
    console.log(`   MD5: ${crypto.createHash('md5').update(password).digest('hex')}`);
    console.log(`   SHA256: ${crypto.createHash('sha256').update(password).digest('hex')}`);
    console.log(`   SHA512: ${crypto.createHash('sha512').update(password).digest('hex')}`);
    console.log(`   Plain: ${password}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkUser();
