import fs from 'fs';
import path from 'path';

export interface ShinobiDbConfig {
  host: string;
  user: string;
  password: string;
  database: string;
  port?: number;
}

interface ShinobiConfigFile {
  db: {
    host: string;
    user: string;
    password: string;
    database: string;
    port: number;
  };
}

// Configuración por defecto
const DEFAULT_CONFIG: ShinobiDbConfig = {
  host: '127.0.0.1',
  user: 'majesticflame',
  password: 'Tu_Passw0rd!23',
  database: 'ccio',
  port: 3306
};

function tryReadJson(filePath: string | undefined): ShinobiConfigFile | null {
  if (!filePath) {
    return null;
  }

  try {
    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) {
      return null;
    }
    const raw = fs.readFileSync(resolved, 'utf8');
    return JSON.parse(raw) as ShinobiConfigFile;
  } catch (error) {
    console.warn(`[shinobi-config] No se pudo leer ${filePath}:`, error);
    return null;
  }
}

export function getShinobiDbConfig(): ShinobiDbConfig {
  // Primero intentar cargar desde variable de entorno
  const envConfig = process.env.SHINOBI_DB_CONFIG
    ? (JSON.parse(process.env.SHINOBI_DB_CONFIG) as ShinobiDbConfig)
    : null;

  if (envConfig) {
    return envConfig;
  }

  // Luego intentar cargar desde archivo de configuración
  const configPaths = [
    process.env.SHINOBI_CONFIG,
    '/etc/shinobi/conf.json',
    '/opt/shinobi/conf.json',
  ];

  for (const configPath of configPaths) {
    const config = tryReadJson(configPath);
    if (config?.db) {
      return {
        ...DEFAULT_CONFIG, // Usar valores por defecto como base
        ...config.db,     // Sobrescribir con los valores del archivo de configuración
      };
    }
  }

  // Si no se encuentra configuración, devolver valores por defecto
  return { ...DEFAULT_CONFIG };
}
