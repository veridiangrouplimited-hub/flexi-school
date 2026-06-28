import { Router } from 'express';
import { z } from 'zod';
import { requirePermission } from '../../middleware/auth';
import { allocateBed, deallocateBed, listDormitories } from './allocation.service';
import { prisma } from '../../prisma/client';

export const hostelRouter = Router();

// Dormitories with beds
hostelRouter.get('/dormitories', async (req, res, next) => {
  try {
    const dorms = await listDormitories(req.tenant.id);
    res.json(dorms);
  } catch (err) { next(err); }
});

// Allocations
hostelRouter.get('/allocations', async (req, res, next) => {
  try {
    const { sessionId } = req.query;
    const allocations = await prisma.hostelAllocation.findMany({
      where: {
        tenantId: req.tenant.id,
        ...(sessionId ? { sessionId: sessionId as string } : {}),
      },
      include: {
        student: { include: { user: { select: { profile: true } } } },
        bed:     { include: { dormitory: { select: { name: true } } } },
      },
      orderBy: { allocatedAt: 'desc' },
    });
    res.json(allocations.map((a) => ({
      id:           a.id,
      allocatedAt:  a.allocatedAt,
      studentId:    a.studentId,
      studentName:  ((a.student.user?.profile as Record<string, unknown>)?.fullName as string) ?? a.student.admissionNo,
      admissionNo:  a.student.admissionNo,
      bedId:        a.bedId,
      dormitory:    a.bed.dormitory.name,
      roomNumber:   a.bed.roomNumber,
      bedNumber:    a.bed.bedNumber,
      sessionId:    a.sessionId,
    })));
  } catch (err) { next(err); }
});

// Allocate bed
const allocateSchema = z.object({
  studentId: z.string().uuid(),
  bedId:     z.string().uuid(),
  sessionId: z.string().uuid(),
});

hostelRouter.post('/allocations', requirePermission('hostel:write'), async (req, res, next) => {
  try {
    const data = allocateSchema.parse(req.body);
    const result = await allocateBed({ ...data, tenantId: req.tenant.id });
    res.status(201).json(result);
  } catch (err) { next(err); }
});

// Deallocate bed
hostelRouter.delete('/allocations/:id', requirePermission('hostel:write'), async (req, res, next) => {
  try {
    await deallocateBed(req.params.id, req.tenant.id);
    res.status(204).send();
  } catch (err) { next(err); }
});
