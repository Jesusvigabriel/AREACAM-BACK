import 'dotenv/config';
import { createPool } from 'mysql2/promise';
import { getShinobiDbConfig } from './config/shinobi';

function resolveDbConfig() {
  try {
    return getShinobiDbConfig();
  } catch (error) {
    const fallback = {
      host: process.env.DB_HOST ?? '127.0.0.1',
      user: process.env.DB_USER ?? 'majesticflame',
      password: process.env.DB_PASSWORD ?? '',
      database: process.env.DB_NAME ?? 'ccio',
      port: Number(process.env.DB_PORT ?? '3306'),
    };
    console.warn('[db] Usando configuración de entorno. Motivo:', error);
    return fallback;
  }
}

const resolvedConfig = resolveDbConfig();

const pool = createPool({
  host: resolvedConfig.host,
  user: resolvedConfig.user,
  password: resolvedConfig.password,
  database: resolvedConfig.database,
  port: resolvedConfig.port ?? 3306,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_LIMIT ?? '10'),
});

export default pool;
