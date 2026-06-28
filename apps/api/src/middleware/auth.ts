import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError';

interface JwtPayload {
  sub: string;       // userId
  tenantId: string;
  role: string;
  permissions: string[];
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user: {
        id: string;
        tenantId: string;
        role: string;
        permissions: string[];
      };
    }
  }
}

export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError('No token provided', 401, 'MISSING_TOKEN'));
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    req.user = {
      id:          payload.sub,
      tenantId:    payload.tenantId,
      role:        payload.role,
      permissions: payload.permissions,
    };
    next();
  } catch {
    next(new AppError('Invalid or expired token', 401, 'INVALID_TOKEN'));
  }
}

/**
 * RBAC guard: ensures the authenticated user holds the required permission.
 *
 * @example
 *   router.delete('/students/:id', requirePermission('students:delete'), handler);
 */
export const requirePermission =
  (permission: string) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user?.permissions.includes(permission)) {
      return next(
        new AppError(
          `Permission denied: '${permission}' required`,
          403,
          'FORBIDDEN',
        ),
      );
    }
    next();
  };
