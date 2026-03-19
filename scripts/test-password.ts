import crypto from 'crypto';

const password = 'TEMPORAL.2025';
const storedHash = '0436618092d65becb742178f739c4e4860c4e2099227b7bffe1960aa8a9e8789';

console.log('🔐 Probando contraseña:', password);
console.log('\nHashes generados:');
console.log(`   MD5: ${crypto.createHash('md5').update(password).digest('hex')}`);
console.log(`   SHA256: ${crypto.createHash('sha256').update(password).digest('hex')}`);
console.log(`   SHA512: ${crypto.createHash('sha512').update(password).digest('hex')}`);
console.log(`\nHash almacenado: ${storedHash}`);

const sha256 = crypto.createHash('sha256').update(password).digest('hex');
if (sha256 === storedHash) {
  console.log('\n✅ ¡Coincide con SHA256!');
} else {
  console.log('\n❌ No coincide');
}
