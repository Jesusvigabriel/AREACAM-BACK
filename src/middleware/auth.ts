import type { Request, Response, NextFunction } from 'express';
import type { RowDataPacket } from 'mysql2/promise';
import pool from '../db';
import { extractRoleFromDetails, type UserRole } from './roles';

export interface AuthenticatedRequest extends Request {
  user?: {
    ke: string;
    uid: string;
    mail: string;
    details: unknown;
    role: UserRole;
  };
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const ke = req.header('x-group-key') ?? req.query.ke;
    const uid = req.header('x-user-id') ?? req.query.uid;

    if (!ke || !uid) {
      return res.status(401).json({ ok: false, message: 'Faltan credenciales (ke, uid).' });
    }

    // Primero intentar buscar por ke y uid exactos
    let [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT ke, uid, mail, details FROM Users WHERE ke = ? AND uid = ? LIMIT 1',
      [ke, uid],
    );

    // Si no encuentra, intentar buscar solo por uid (para compatibilidad)
    if (!rows.length) {
      [rows] = await pool.execute<RowDataPacket[]>(
        'SELECT ke, uid, mail, details FROM Users WHERE uid = ? LIMIT 1',
        [uid],
      );

      // Si encuentra usuario pero el grupo no coincide, verificar permisos
      if (rows.length && rows[0] && (rows[0] as any).ke !== ke) {
        // En Shinobi, verificar si el usuario tiene permisos para este grupo
        // Por ahora, permitir si el usuario existe
        console.warn(`[auth] Usuario ${uid} accediendo a grupo ${ke}, grupo real: ${(rows[0] as any).ke}`);
      }
    }

    if (!rows.length) {
      return res.status(401).json({ ok: false, message: 'Usuario no encontrado.' });
    }

    const user = rows[0] as RowDataPacket & {
      ke: string;
      uid: string;
      mail: string;
      details: string | null;
    };
    let details: unknown = null;
    try {
      details = user.details ? JSON.parse(user.details) : null;
    } catch (error) {
      details = null;
    }

    if (!user.uid) {
      return res.status(401).json({ ok: false, message: 'Datos de usuario incompletos.' });
    }

    req.user = {
      ke: user.ke,
      uid: user.uid,
      mail: user.mail,
      details,
      role: extractRoleFromDetails(details),
    };

    return next();
  } catch (error) {
    console.error('[auth] error validando cabeceras', error);
    return res.status(500).json({ ok: false, message: 'Error del servidor validando sesión' });
  }
}

