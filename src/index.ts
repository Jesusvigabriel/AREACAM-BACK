import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import loginRouter from './routes/login';
import monitorsRouter from './routes/monitors';
import usersRouter from './routes/users';
import recordingsRouter from './routes/recordings';
import configRouter from './routes/config';
import cameraGroupsRouter from './routes/camera-groups';
import motionEventsRouter from './routes/motion-events';
import motionRecordingsRouter from './routes/motion-recordings';
import streamsRouter from './routes/streams';
import pool from './db';
import { initMotionProcessing } from './services/motion';
import { syncCamerasToMediaMTX } from './services/streaming/stream-manager';
import { startAutoSync } from './services/streaming/auto-sync';

const app = express();
const port = process.env.PORT ?? 4000;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const inicio = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - inicio;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
  });
  next();
});

// Servir archivos estáticos (para test-stream.html)
app.use('/test', express.static('test'));

// Servir archivos de branding
app.use('/uploads/branding', express.static('/mnt/videos/areacam/recordings/branding'));

app.use('/auth', loginRouter);
app.use('/monitors', monitorsRouter);
app.use('/users', usersRouter);
app.use('/recordings', recordingsRouter);
app.use('/config', configRouter);
app.use('/camera-groups', cameraGroupsRouter);
app.use('/motion-events', motionEventsRouter);
app.use('/motion-recordings', motionRecordingsRouter);
app.use('/streams', streamsRouter);

// Inicializar servicios
initMotionProcessing();

// Sincronizar cámaras con MediaMTX al iniciar
setTimeout(async () => {
  console.log('[areacam] 🔄 Sincronizando cámaras con MediaMTX...');
  const result = await syncCamerasToMediaMTX();
  if (result.success) {
    console.log(`[areacam] ✅ ${result.camerasConfigured} cámaras configuradas`);
  } else {
    console.error('[areacam] ❌ Error en sincronización inicial');
  }
  
  // Iniciar sincronización automática periódica
  startAutoSync();
}, 2000);

// Endpoint temporal para obtener credenciales válidas (desarrollo)
app.get('/debug/credentials', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT uid, ke, mail FROM Users LIMIT 10');
    res.json({
      ok: true,
      message: 'Credenciales válidas para desarrollo',
      credentials: rows
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'Error obteniendo credenciales' });
  }
});

const host = process.env.HOST || '0.0.0.0';
const serverIp = process.env.SERVER_IP || 'localhost';
app.listen(Number(port), host, () => {
  console.log(`[areacam] 🚀 Backend running on http://${host}:${port}`);
  console.log(`[areacam] 🌐 Accesible desde: http://${serverIp}:${port}`);
});
