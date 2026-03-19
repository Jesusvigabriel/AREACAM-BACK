import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './auth';

export type UserRole = 'admin' | 'operario';

export interface UserWithRole {
  uid: string;
  ke: string;
  mail: string;
  role: UserRole;
}

/**
 * Middleware para verificar que el usuario tiene el rol requerido
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user as UserWithRole | undefined;

    if (!user) {
      return res.status(401).json({
        ok: false,
        message: 'No autenticado'
      });
    }

    // Si no tiene rol definido, asumimos 'operario' por defecto
    const userRole = user.role || 'operario';

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        ok: false,
        message: 'No tienes permisos para realizar esta acción'
      });
    }

    next();
  };
}

/**
 * Middleware solo para administradores
 */
export const requireAdmin = requireRole('admin');

/**
 * Helper para determinar el rol desde el campo 'details' de Shinobi
 */
export function extractRoleFromDetails(details: unknown): UserRole {
  if (!details) return 'operario';

  try {
    let parsed: any;
    
    if (typeof details === 'string') {
      parsed = JSON.parse(details);
    } else if (typeof details === 'object') {
      parsed = details;
    } else {
      return 'operario';
    }

    // Buscar el rol en el objeto details
    if (parsed.role === 'admin' || parsed.role === 'administrator') {
      return 'admin';
    }

    return 'operario';
  } catch {
    return 'operario';
  }
}
