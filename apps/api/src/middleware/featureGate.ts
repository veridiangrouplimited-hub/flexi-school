import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

/**
 * Route-level guard: blocks the request if `flag` is disabled for the tenant.
 * Must be mounted after tenantIsolation middleware.
 *
 * @example
 *   router.use('/hostel', requireFlag('hostel'), hostelRouter);
 *   router.use('/sports', requireFlag('sports'), sportsRouter);
 */
export const requireFlag =
  (flag: string) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.tenant?.flags[flag]) {
      return next(
        new AppError(
          `Module '${flag}' is not enabled for this school`,
          403,
          'FEATURE_DISABLED',
        ),
      );
    }
    next();
  };

/**
 * Blocks write operations (POST/PUT/PATCH/DELETE) when subscription is
 * not ACTIVE. Apply globally after tenantIsolation.
 */
export function requireWriteAccess(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (writeMethods.includes(req.method) && req.tenant?.subStatus !== 'ACTIVE') {
    return next(
      new AppError(
        'Writes are disabled — subscription is not active',
        403,
        'WRITE_DISABLED',
      ),
    );
  }
  next();
}
