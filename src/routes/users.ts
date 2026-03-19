import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import type { RowDataPacket } from 'mysql2/promise';
import pool from '../db';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/roles';

const router = Router();

const updatePermissionsSchema = z
  .object({
    allmonitors: z.enum(['0', '1']).optional(),
    monitors: z.array(z.string()).optional(),
    monitor_edit: z.array(z.string()).optional(),
    video_view: z.array(z.string()).optional(),
    video_delete: z.array(z.string()).optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Debe enviar al menos un campo para actualizar',
  });

function parseDetails(details: string | null): Record<string, unknown> {
  if (!details) {
    return {};
  }

  try {
    const parsed = JSON.parse(details);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, unknown>;
    }
  } catch (error) {
    console.warn('[users] no se pudo parsear details', error);
  }
  return {};
}

function isSubAccount(details: unknown): boolean {
  return Boolean(details && typeof details === 'object' && (details as Record<string, unknown>).sub === '1');
}

router.use(requireAuth);

router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const groupKey = req.user?.ke;
    const userDetails = req.user?.details;

    if (!groupKey) {
      return res.status(401).json({ ok: false, message: 'Sesión no válida' });
    }

    if (isSubAccount(userDetails)) {
      return res.status(403).json({ ok: false, message: 'No autorizado para listar usuarios' });
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT uid, ke, mail, details FROM Users WHERE ke = ? ORDER BY mail ASC',
      [groupKey],
    );

    const users = rows.map((row) => ({
      uid: String(row.uid ?? ''),
      ke: String(row.ke ?? ''),
      mail: String(row.mail ?? ''),
      details: parseDetails(row.details ? String(row.details) : null),
    }));

    return res.json({ ok: true, users });
  } catch (error) {
    console.error('[users] error listando usuarios', error);
    return res.status(500).json({ ok: false, message: 'Error al listar usuarios' });
  }
});

// Crear nuevo usuario (solo admin)
router.post('/', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const groupKey = req.user?.ke;
    const { mail, password, role, cameras } = req.body;

    if (!groupKey) {
      return res.status(401).json({ ok: false, message: 'Sesión no válida' });
    }

    if (!mail || !password) {
      return res.status(400).json({ ok: false, message: 'Email y contraseña son requeridos' });
    }

    // Verificar si el usuario ya existe
    const [existing] = await pool.execute<RowDataPacket[]>(
      'SELECT uid FROM Users WHERE mail = ? LIMIT 1',
      [mail]
    );

    if (existing.length > 0) {
      return res.status(400).json({ ok: false, message: 'El usuario ya existe' });
    }

    // Generar UID único
    const uid = crypto.randomBytes(5).toString('hex');

    // Hashear contraseña
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

    // Crear objeto details con rol y cámaras
    const details: Record<string, unknown> = {
      role: role || 'operario',
    };

    if (cameras && Array.isArray(cameras)) {
      details.monitors = cameras;
      details.allmonitors = '0';
    } else {
      details.allmonitors = '1';
    }

    // Insertar usuario
    await pool.execute(
      'INSERT INTO Users (ke, uid, mail, pass, details) VALUES (?, ?, ?, ?, ?)',
      [groupKey, uid, mail, hashedPassword, JSON.stringify(details)]
    );

    return res.json({
      ok: true,
      user: {
        uid,
        ke: groupKey,
        mail,
        details,
      },
    });
  } catch (error) {
    console.error('[users] error creando usuario', error);
    return res.status(500).json({ ok: false, message: 'Error al crear usuario' });
  }
});

// Actualizar rol de usuario (solo admin)
router.patch('/:uid/role', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const groupKey = req.user?.ke;
    const targetUid = req.params.uid;
    const { role } = req.body;

    if (!groupKey || !targetUid) {
      return res.status(400).json({ ok: false, message: 'Parámetros inválidos' });
    }

    if (!role || !['admin', 'operario'].includes(role)) {
      return res.status(400).json({ ok: false, message: 'Rol inválido' });
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT details FROM Users WHERE ke = ? AND uid = ? LIMIT 1',
      [groupKey, targetUid]
    );

    if (!rows.length) {
      return res.status(404).json({ ok: false, message: 'Usuario no encontrado' });
    }

    const row = rows[0];
    if (!row) {
      return res.status(404).json({ ok: false, message: 'Usuario no encontrado' });
    }
    
    const details = parseDetails(row.details ? String(row.details) : null);
    details.role = role;

    await pool.execute(
      'UPDATE Users SET details = ? WHERE ke = ? AND uid = ?',
      [JSON.stringify(details), groupKey, targetUid]
    );

    return res.json({ ok: true, message: 'Rol actualizado' });
  } catch (error) {
    console.error('[users] error actualizando rol', error);
    return res.status(500).json({ ok: false, message: 'Error al actualizar rol' });
  }
});

// Asignar cámaras a usuario (solo admin)
router.patch('/:uid/cameras', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const groupKey = req.user?.ke;
    const targetUid = req.params.uid;
    const { cameras, allMonitors } = req.body;

    if (!groupKey || !targetUid) {
      return res.status(400).json({ ok: false, message: 'Parámetros inválidos' });
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT details FROM Users WHERE ke = ? AND uid = ? LIMIT 1',
      [groupKey, targetUid]
    );

    if (!rows.length) {
      return res.status(404).json({ ok: false, message: 'Usuario no encontrado' });
    }

    const row = rows[0];
    if (!row) {
      return res.status(404).json({ ok: false, message: 'Usuario no encontrado' });
    }
    
    const details = parseDetails(row.details ? String(row.details) : null);

    if (allMonitors) {
      details.allmonitors = '1';
      delete details.monitors;
    } else if (cameras && Array.isArray(cameras)) {
      details.allmonitors = '0';
      details.monitors = cameras;
    }

    await pool.execute(
      'UPDATE Users SET details = ? WHERE ke = ? AND uid = ?',
      [JSON.stringify(details), groupKey, targetUid]
    );

    return res.json({ ok: true, message: 'Cámaras asignadas' });
  } catch (error) {
    console.error('[users] error asignando cámaras', error);
    return res.status(500).json({ ok: false, message: 'Error al asignar cámaras' });
  }
});

// Eliminar usuario (solo admin)
router.delete('/:uid', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const groupKey = req.user?.ke;
    const targetUid = req.params.uid;

    if (!groupKey || !targetUid) {
      return res.status(400).json({ ok: false, message: 'Parámetros inválidos' });
    }

    // No permitir eliminar al propio usuario
    if (req.user?.uid === targetUid) {
      return res.status(400).json({ ok: false, message: 'No puedes eliminar tu propio usuario' });
    }

    await pool.execute(
      'DELETE FROM Users WHERE ke = ? AND uid = ?',
      [groupKey, targetUid]
    );

    return res.json({ ok: true, message: 'Usuario eliminado' });
  } catch (error) {
    console.error('[users] error eliminando usuario', error);
    return res.status(500).json({ ok: false, message: 'Error al eliminar usuario' });
  }
});

router.patch('/:uid', async (req: AuthenticatedRequest, res) => {
  try {
    const groupKey = req.user?.ke;
    const requesterDetails = req.user?.details;
    const targetUid = req.params.uid;

    if (!groupKey) {
      return res.status(401).json({ ok: false, message: 'Sesión no válida' });
    }

    if (!targetUid) {
      return res.status(400).json({ ok: false, message: 'Falta el identificador de usuario' });
    }

    if (isSubAccount(requesterDetails)) {
      return res.status(403).json({ ok: false, message: 'No autorizado para editar usuarios' });
    }

    const parsed = updatePermissionsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ ok: false, message: 'Datos inválidos', errors: parsed.error.flatten() });
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT uid, ke, mail, details FROM Users WHERE ke = ? AND uid = ? LIMIT 1',
      [groupKey, targetUid],
    );

    if (!rows.length) {
      return res.status(404).json({ ok: false, message: 'Usuario no encontrado' });
    }

    const [row] = rows;

    if (!row) {
      return res.status(404).json({ ok: false, message: 'Usuario no encontrado' });
    }

    const details = parseDetails(row.details ? String(row.details) : null);

    const updates = parsed.data;

    if (updates.allmonitors !== undefined) {
      details.allmonitors = updates.allmonitors;
    }

    if (updates.monitors !== undefined) {
      details.monitors = updates.monitors;
    }

    if (updates.monitor_edit !== undefined) {
      details.monitor_edit = updates.monitor_edit;
    }

    if (updates.video_view !== undefined) {
      details.video_view = updates.video_view;
    }

    if (updates.video_delete !== undefined) {
      details.video_delete = updates.video_delete;
    }

    await pool.execute(
      'UPDATE Users SET details = ? WHERE ke = ? AND uid = ? LIMIT 1',
      [JSON.stringify(details), groupKey, targetUid],
    );

    return res.json({ ok: true, user: { uid: row.uid, ke: row.ke, mail: row.mail, details } });
  } catch (error) {
    console.error('[users] error actualizando usuario', error);
    return res.status(500).json({ ok: false, message: 'Error al actualizar usuario' });
  }
});

export default router;
