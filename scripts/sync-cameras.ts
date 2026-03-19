import { syncAndReload } from '../src/services/mediamtx-sync';

async function main() {
  try {
    console.log('🔄 Sincronizando cámaras con MediaMTX...\n');
    await syncAndReload();
    console.log('\n✅ Sincronización completada exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error en sincronización:', error);
    process.exit(1);
  }
}

main();
