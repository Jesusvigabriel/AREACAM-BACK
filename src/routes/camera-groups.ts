import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import pool from '../db';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { z } from 'zod';

const router = Router();

router.use(requireAuth);

// Esquema de validación para crear/actualizar grupo
const cameraGroupSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(100),
  cameraIds: z.array(z.string()).max(6, 'Máximo 6 cámaras por grupo'),
  gridSize: z.number().int().min(1).max(6).optional().default(4),
  isDefault: z.boolean().optional().default(false),
});

/**
 * GET /camera-groups/available-cameras
 * Obtener lista de cámaras disponibles para agregar a grupos
 */
router.get('/available-cameras', async (req: AuthenticatedRequest, res) => {
  try {
    const groupKey = req.user?.ke;

    if (!groupKey) {
      return res.status(401).json({ ok: false, message: 'Usuario no autenticado' });
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT mid, name, type, host, port, mode 
       FROM Monitors 
       WHERE ke = ? 
       ORDER BY name ASC`,
      [groupKey]
    );

    const cameras = rows.map(row => ({
      mid: String(row.mid ?? ''),
      name: String(row.name ?? ''),
      type: String(row.type ?? ''),
      host: String(row.host ?? ''),
      port: row.port !== undefined && row.port !== null ? String(row.port) : null,
      mode: row.mode !== undefined && row.mode !== null ? String(row.mode) : null,
    }));

    return res.json({ ok: true, cameras });
  } catch (error) {
    console.error('[camera-groups] Error obteniendo cámaras disponibles:', error);
    return res.status(500).json({ ok: false, message: 'Error al obtener cámaras disponibles' });
  }
});

/**
 * GET /camera-groups
 * Obtener todos los grupos de cámaras del usuario
 */
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.uid;
    const groupKey = req.user?.ke;

    if (!userId || !groupKey) {
      return res.status(401).json({ ok: false, message: 'Usuario no autenticado' });
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, user_id, group_key, name, camera_ids, grid_size, is_default, created_at, updated_at
       FROM CameraGroups
       WHERE user_id = ? AND group_key = ?
       ORDER BY is_default DESC, name ASC`,
      [userId, groupKey]
    );

    const groups = rows.map(row => {
      let cameraIds = [];
      try {
        // MySQL devuelve JSON como objeto ya parseado o como string
        if (Array.isArray(row.camera_ids)) {
          cameraIds = row.camera_ids;
        } else if (typeof row.camera_ids === 'string') {
          cameraIds = row.camera_ids && row.camera_ids.trim() !== '' ? JSON.parse(row.camera_ids) : [];
        } else if (row.camera_ids) {
          cameraIds = row.camera_ids;
        }
      } catch (e) {
        console.warn(`[camera-groups] Error parsing camera_ids for group ${row.id}:`, e);
        cameraIds = [];
      }
      
      return {
        id: row.id,
        userId: row.user_id,
        groupKey: row.group_key,
        name: row.name,
        cameraIds,
        gridSize: row.grid_size,
        isDefault: Boolean(row.is_default),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    });

    return res.json({ ok: true, groups });
  } catch (error) {
    console.error('[camera-groups] Error obteniendo grupos:', error);
    return res.status(500).json({ ok: false, message: 'Error al obtener grupos' });
  }
});

/**
 * POST /camera-groups
 * Crear un nuevo grupo de cámaras
 */
router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.uid;
    const groupKey = req.user?.ke;

    if (!userId || !groupKey) {
      return res.status(401).json({ ok: false, message: 'Usuario no autenticado' });
    }

    console.log('[camera-groups] POST request body:', JSON.stringify(req.body, null, 2));
    
    const parsed = cameraGroupSchema.safeParse(req.body);
    if (!parsed.success) {
      console.error('[camera-groups] Validation error:', JSON.stringify(parsed.error.flatten(), null, 2));
      return res.status(400).json({
        ok: false,
        message: 'Datos inválidos',
        errors: parsed.error.flatten(),
      });
    }

    const { name, cameraIds, gridSize, isDefault } = parsed.data;

    // Generar ID único (máximo 20 caracteres)
    const timestamp = Date.now().toString(36); // Timestamp en base36 (más corto)
    const random = Math.random().toString(36).substr(2, 6); // 6 caracteres aleatorios
    const id = `g_${timestamp}_${random}`; // Formato: g_timestamp_random

    // Si este grupo es el predeterminado, quitar el flag de otros grupos
    if (isDefault) {
      await pool.execute(
        'UPDATE CameraGroups SET is_default = FALSE WHERE user_id = ? AND group_key = ?',
        [userId, groupKey]
      );
    }

    await pool.execute(
      `INSERT INTO CameraGroups (id, user_id, group_key, name, camera_ids, grid_size, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, groupKey, name, JSON.stringify(cameraIds), gridSize, isDefault]
    );

    return res.json({
      ok: true,
      message: 'Grupo creado exitosamente',
      group: {
        id,
        userId,
        groupKey,
        name,
        cameraIds,
        gridSize,
        isDefault,
      },
    });
  } catch (error) {
    console.error('[camera-groups] Error creando grupo:', error);
    return res.status(500).json({ ok: false, message: 'Error al crear grupo' });
  }
});

/**
 * PATCH /camera-groups/:id
 * Actualizar un grupo de cámaras
 */
router.patch('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.uid;
    const groupKey = req.user?.ke;
    const { id } = req.params;

    if (!userId || !groupKey) {
      return res.status(401).json({ ok: false, message: 'Usuario no autenticado' });
    }

    const parsed = cameraGroupSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: 'Datos inválidos',
        errors: parsed.error.flatten(),
      });
    }

    const updates = parsed.data;
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }

    if (updates.cameraIds !== undefined) {
      fields.push('camera_ids = ?');
      values.push(JSON.stringify(updates.cameraIds));
    }

    if (updates.gridSize !== undefined) {
      fields.push('grid_size = ?');
      values.push(updates.gridSize);
    }

    if (updates.isDefault !== undefined) {
      // Si este grupo se marca como predeterminado, quitar el flag de otros
      if (updates.isDefault) {
        await pool.execute(
          'UPDATE CameraGroups SET is_default = FALSE WHERE user_id = ? AND group_key = ?',
          [userId, groupKey]
        );
      }
      fields.push('is_default = ?');
      values.push(updates.isDefault);
    }

    if (fields.length === 0) {
      return res.status(400).json({ ok: false, message: 'No hay campos para actualizar' });
    }

    values.push(userId, groupKey, id);

    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE CameraGroups SET ${fields.join(', ')} WHERE user_id = ? AND group_key = ? AND id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, message: 'Grupo no encontrado' });
    }

    return res.json({ ok: true, message: 'Grupo actualizado exitosamente' });
  } catch (error) {
    console.error('[camera-groups] Error actualizando grupo:', error);
    return res.status(500).json({ ok: false, message: 'Error al actualizar grupo' });
  }
});

/**
 * DELETE /camera-groups/:id
 * Eliminar un grupo de cámaras
 */
router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.uid;
    const groupKey = req.user?.ke;
    const { id } = req.params;

    if (!userId || !groupKey) {
      return res.status(401).json({ ok: false, message: 'Usuario no autenticado' });
    }

    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM CameraGroups WHERE id = ? AND user_id = ? AND group_key = ?',
      [id, userId, groupKey]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, message: 'Grupo no encontrado' });
    }

    return res.json({ ok: true, message: 'Grupo eliminado exitosamente' });
  } catch (error) {
    console.error('[camera-groups] Error eliminando grupo:', error);
    return res.status(500).json({ ok: false, message: 'Error al eliminar grupo' });
  }
});

export default router;
