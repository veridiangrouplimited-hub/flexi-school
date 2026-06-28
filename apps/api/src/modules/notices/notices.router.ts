import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma/client';
import { requirePermission } from '../../middleware/auth';
import { AppError } from '../../utils/AppError';

export const noticesRouter = Router();

// ── GET /api/notices ─────────────────────────────────────────────────────────

noticesRouter.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 20), 50);
    const now   = new Date();

    const notices = await prisma.notice.findMany({
      where: {
        tenantId: req.tenant.id,
        OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
      },
      include: { author: { select: { profile: true } } },
      orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
      take: limit,
    });

    res.json(notices.map(n => ({
      id:          n.id,
      title:       n.title,
      body:        n.body,
      category:    n.category,
      isPinned:    n.isPinned,
      targetRoles: n.targetRoles,
      publishedAt: n.publishedAt,
      expiresAt:   n.expiresAt,
      author:      (n.author?.profile as Record<string, unknown>)?.fullName as string ?? 'School Admin',
    })));
  } catch (err) { next(err); }
});

// ── POST /api/notices ─────────────────────────────────────────────────────────

const createSchema = z.object({
  title:       z.string().min(3).max(200),
  body:        z.string().min(1),
  category:    z.enum(['GENERAL', 'ACADEMIC', 'FINANCE', 'HOSTEL', 'SPORTS', 'EMERGENCY']).optional(),
  isPinned:    z.boolean().optional(),
  targetRoles: z.array(z.string()).optional(),
  expiresAt:   z.string().datetime().optional(),
});

noticesRouter.post('/', requirePermission('settings:write'), async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const notice = await prisma.notice.create({
      data: {
        tenantId:    req.tenant.id,
        title:       body.title,
        body:        body.body,
        category:    body.category ?? 'GENERAL',
        isPinned:    body.isPinned ?? false,
        targetRoles: body.targetRoles ?? [],
        expiresAt:   body.expiresAt ? new Date(body.expiresAt) : undefined,
        authorId:    req.user.id,
      },
    });
    res.status(201).json(notice);
  } catch (err) { next(err); }
});

// ── PATCH /api/notices/:id ────────────────────────────────────────────────────

const updateSchema = createSchema.partial();

noticesRouter.patch('/:id', requirePermission('settings:write'), async (req, res, next) => {
  try {
    const existing = await prisma.notice.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.tenantId !== req.tenant.id) throw new AppError('Notice not found', 404, 'NOT_FOUND');

    const body   = updateSchema.parse(req.body);
    const notice = await prisma.notice.update({
      where: { id: req.params.id },
      data:  {
        ...body,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      },
    });
    res.json(notice);
  } catch (err) { next(err); }
});

// ── DELETE /api/notices/:id ───────────────────────────────────────────────────

noticesRouter.delete('/:id', requirePermission('settings:write'), async (req, res, next) => {
  try {
    const existing = await prisma.notice.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.tenantId !== req.tenant.id) throw new AppError('Notice not found', 404, 'NOT_FOUND');
    await prisma.notice.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});
