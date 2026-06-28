import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../prisma/client';
import { authenticate } from '../../middleware/auth';
import { AppError } from '../../utils/AppError';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: { select: { name: true, permissions: true } },
        tenant: {
          select: {
            id: true, name: true, level: true, boardingType: true,
            subStatus: true, subTier: true, featureFlags: true, branding: true,
          },
        },
      },
    });

    // Constant-time path to prevent user enumeration
    if (!user || !user.isActive) {
      await bcrypt.compare('dummy', '$2b$10$dummyhashXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');

    if (!user.tenant) throw new AppError('Tenant not found', 400, 'NO_TENANT');

    if (user.tenant.subStatus === 'SUSPENDED') {
      throw new AppError('Account suspended', 403, 'ACCOUNT_SUSPENDED');
    }

    const permissions = (user.role.permissions as string[]) ?? [];
    const token = jwt.sign(
      { sub: user.id, tenantId: user.tenantId, role: user.role.name, permissions },
      process.env.JWT_SECRET!,
      { expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn'] },
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role.name,
        permissions,
        tenantId: user.tenantId,
        profile: user.profile,
      },
      tenant: buildTenantPayload(user.tenant),
    });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.user.id },
      include: {
        role: { select: { name: true, permissions: true } },
        tenant: {
          select: {
            id: true, name: true, level: true, boardingType: true,
            subStatus: true, subTier: true, featureFlags: true, branding: true,
          },
        },
      },
    });

    if (!user.tenant) throw new AppError('Tenant not found', 400, 'NO_TENANT');

    const permissions = (user.role.permissions as string[]) ?? [];
    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role.name,
        permissions,
        tenantId: user.tenantId,
        profile: user.profile,
      },
      tenant: buildTenantPayload(user.tenant),
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', (_req, res) => {
  res.json({ ok: true });
});

type TenantRow = {
  id: string; name: string;
  level: string; boardingType: string; subStatus: string; subTier: string;
  featureFlags: unknown; branding: unknown;
};
// subTier is already in TenantRow above — used by buildTenantPayload

function buildTenantPayload(tenant: TenantRow) {
  const overrides = (tenant.featureFlags as Record<string, boolean>) ?? {};
  const flags: Record<string, boolean> = {
    hostel:       ['BOARDING_ONLY', 'HYBRID'].includes(tenant.boardingType),
    finance:      ['PROFESSIONAL', 'ENTERPRISE'].includes(tenant.subTier),
    sports:       overrides.sports  ?? true,
    alumni:       overrides.alumni  ?? false,
    write_access: tenant.subStatus !== 'SUSPENDED',
    ...overrides,
  };
  return {
    id:           tenant.id,
    name:         tenant.name,
    level:        tenant.level,
    boardingType: tenant.boardingType,
    subStatus:    tenant.subStatus,
    subTier:      tenant.subTier,
    flags,
    branding:     (tenant.branding as Record<string, string>) ?? {},
  };
}
