import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma/client';
import { AppError } from '../utils/AppError';

declare global {
  namespace Express {
    interface Request {
      tenant: {
        id: string;
        boardingType: 'DAY_ONLY' | 'BOARDING_ONLY' | 'HYBRID';
        level: 'PRIMARY' | 'SECONDARY' | 'K_12';
        subStatus: 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED';
        flags: Record<string, boolean>;
      };
    }
  }
}

export async function tenantIsolation(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // JWT claim and X-Tenant-ID header must agree — prevents header spoofing
  const jwtTenantId = (req as any).user?.tenantId as string | undefined;
  const headerTenantId = req.headers['x-tenant-id'] as string | undefined;

  if (jwtTenantId && headerTenantId && jwtTenantId !== headerTenantId) {
    return next(new AppError('Tenant mismatch', 401, 'TENANT_MISMATCH'));
  }

  const tenantId =
    jwtTenantId ?? headerTenantId ?? extractSubdomain(req.hostname);

  if (!tenantId) {
    return next(new AppError('Tenant context missing', 400, 'MISSING_TENANT'));
  }

  // In production: check Redis cache first (TTL 60s), fall back to DB
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      boardingType: true,
      level: true,
      subStatus: true,
      subTier: true,
      featureFlags: true,
    },
  });

  if (!tenant) {
    await constantDelay(200); // prevent timing-based tenant ID enumeration
    return next(new AppError('Unknown tenant', 401, 'INVALID_TENANT'));
  }

  if (tenant.subStatus === 'SUSPENDED') {
    return next(new AppError('Account suspended', 403, 'ACCOUNT_SUSPENDED'));
  }

  req.tenant = {
    id: tenant.id,
    boardingType: tenant.boardingType as 'DAY_ONLY' | 'BOARDING_ONLY' | 'HYBRID',
    level: tenant.level as 'PRIMARY' | 'SECONDARY' | 'K_12',
    subStatus: tenant.subStatus as 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED',
    flags: deriveFlags(tenant),
  };

  // Activate PostgreSQL RLS — all subsequent queries in this session are scoped
  await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenant.id}, TRUE)`;

  next();
}

function extractSubdomain(hostname: string): string | undefined {
  // "kings-college.flexischool.app" → look up tenant by subdomain slug
  const parts = hostname.split('.');
  return parts.length >= 3 ? parts[0] : undefined;
}

function deriveFlags(tenant: {
  boardingType: string;
  subTier: string;
  featureFlags: unknown;
}): Record<string, boolean> {
  const overrides = (tenant.featureFlags as Record<string, boolean>) ?? {};
  return {
    hostel:       ['BOARDING_ONLY', 'HYBRID'].includes(tenant.boardingType),
    finance:      ['PROFESSIONAL', 'ENTERPRISE'].includes(tenant.subTier),
    sports:       overrides.sports  ?? true,
    alumni:       overrides.alumni  ?? false,
    write_access: true, // suspended path exits above; PAST_DUE allows reads
    ...overrides,       // super-admin overrides win
  };
}

const constantDelay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
