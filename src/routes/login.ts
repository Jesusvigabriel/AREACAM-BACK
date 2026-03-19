import { Router } from 'express';
import crypto from 'crypto';
import type { RowDataPacket } from 'mysql2/promise';
import pool from '../db';
import { extractRoleFromDetails } from '../middleware/roles';

type LoginRequest = {
  email?: string;
  password?: string;
  groupKey?: string;
};

interface UserRow extends RowDataPacket {
  ke: string;
  uid: string;
  mail: string;
  details: string | null;
}

function hashPassword(password: string): string {
  const algorithm = (process.env.PASSWORD_TYPE ?? 'sha256').toLowerCase();
  switch (algorithm) {
    case 'md5':
      return crypto.createHash('md5').update(password).digest('hex');
    case 'sha512': {
      const salt = process.env.PASSWORD_SALT ?? '';
      if (salt) {
        return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
      }
      return crypto.createHash('sha512').update(password).digest('hex');
    }
    case 'sha256':
    default:
      return crypto.createHash('sha256').update(password).digest('hex');
  }
}

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password, groupKey }: LoginRequest = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ ok: false, message: 'Correo y contraseña son obligatorios' });
  }

  try {
    const hashedPassword = hashPassword(password);
    const sqlBase =
      'SELECT ke, uid, mail, details FROM Users WHERE mail = ? AND (pass = ? OR pass = ?)';
    const sql = groupKey ? `${sqlBase} AND ke = ? LIMIT 1` : `${sqlBase} LIMIT 1`;
    const params = groupKey
      ? [email, password, hashedPassword, groupKey]
      : [email, password, hashedPassword];

    const [rows] = await pool.execute<UserRow[]>(sql, params);

    if (rows.length === 0) {
      return res.status(401).json({ ok: false, message: 'Credenciales inválidas' });
    }

    const [user] = rows;

    if (!user) {
      return res.status(500).json({ ok: false, message: 'No se pudo obtener el usuario' });
    }
    let details: unknown = null;
    try {
      details = user.details ? JSON.parse(user.details) : null;
    } catch (error) {
      details = null;
    }

    const role = extractRoleFromDetails(details);

    return res.json({
      ok: true,
      user: {
        ke: user.ke,
        uid: user.uid,
        mail: user.mail,
        details,
        role,
      },
    });
  } catch (error) {
    console.error('[auth] error validando usuario', error);
    return res.status(500).json({ ok: false, message: 'Error del servidor al validar usuario' });
  }
});

export default router;
