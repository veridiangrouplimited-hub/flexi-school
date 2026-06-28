import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma/client';
import { requirePermission } from '../../middleware/auth';
import { AppError } from '../../utils/AppError';

export const attendanceRouter = Router();

// ── GET /api/attendance?classId=&date= ──────────────────────────────────────
// Returns every student in the class with their attendance status for the date

attendanceRouter.get('/', async (req, res, next) => {
  try {
    const { classId, date } = req.query;
    if (!classId) throw new AppError('classId is required', 400, 'MISSING_PARAM');

    const cls = await prisma.class.findUnique({
      where: { id: classId as string },
      include: {
        students: {
          include: { user: { select: { profile: true } } },
          orderBy: { admissionNo: 'asc' },
        },
      },
    });
    if (!cls || cls.tenantId !== req.tenant.id) throw new AppError('Class not found', 404, 'NOT_FOUND');

    const attendanceDate = date ? new Date(date as string) : new Date();
    attendanceDate.setHours(0, 0, 0, 0);

    const records = await prisma.attendance.findMany({
      where: { tenantId: req.tenant.id, classId: cls.id, date: attendanceDate },
    });

    const recordMap = new Map(records.map(r => [r.studentId, r]));

    res.json({
      classId: cls.id,
      className: cls.name,
      date: attendanceDate,
      students: cls.students.map(s => ({
        studentId:   s.id,
        admissionNo: s.admissionNo,
        fullName:    (s.user?.profile as Record<string, unknown>)?.fullName as string ?? s.admissionNo,
        status:      recordMap.get(s.id)?.status ?? null,
        notes:       recordMap.get(s.id)?.notes  ?? null,
        recordId:    recordMap.get(s.id)?.id      ?? null,
      })),
    });
  } catch (err) { next(err); }
});

// ── POST /api/attendance (bulk upsert) ──────────────────────────────────────

const bulkSchema = z.object({
  classId:   z.string().uuid(),
  sessionId: z.string().uuid(),
  date:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  records: z.array(z.object({
    studentId: z.string().uuid(),
    status:    z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
    notes:     z.string().optional(),
  })),
});

attendanceRouter.post('/', requirePermission('academic:write'), async (req, res, next) => {
  try {
    const body = bulkSchema.parse(req.body);
    const date = new Date(body.date);
    date.setHours(0, 0, 0, 0);

    await prisma.$transaction(
      body.records.map(r =>
        prisma.attendance.upsert({
          where: {
            tenantId_classId_date_studentId: {
              tenantId:  req.tenant.id,
              classId:   body.classId,
              date,
              studentId: r.studentId,
            },
          },
          create: {
            tenantId:  req.tenant.id,
            classId:   body.classId,
            sessionId: body.sessionId,
            date,
            studentId: r.studentId,
            status:    r.status,
            notes:     r.notes,
            markedBy:  req.user.id,
          },
          update: {
            status:   r.status,
            notes:    r.notes,
            markedBy: req.user.id,
          },
        }),
      ),
    );

    res.json({ ok: true, count: body.records.length });
  } catch (err) { next(err); }
});

// ── GET /api/attendance/summary?classId=&sessionId= ─────────────────────────
// Absence/presence summary per student for admin/teacher view

attendanceRouter.get('/summary', async (req, res, next) => {
  try {
    const { classId, sessionId } = req.query;
    if (!classId || !sessionId) throw new AppError('classId and sessionId are required', 400, 'MISSING_PARAM');

    const counts = await prisma.attendance.groupBy({
      by: ['studentId', 'status'],
      where: { tenantId: req.tenant.id, classId: classId as string, sessionId: sessionId as string },
      _count: true,
    });

    const byStudent: Record<string, Record<string, number>> = {};
    for (const row of counts) {
      byStudent[row.studentId] ??= {};
      byStudent[row.studentId][row.status] = row._count;
    }

    res.json(byStudent);
  } catch (err) { next(err); }
});

// ── GET /api/attendance/today-summary ───────────────────────────────────────
// School-wide attendance rate for today — used on admin dashboard

attendanceRouter.get('/today-summary', async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [present, total] = await Promise.all([
      prisma.attendance.count({ where: { tenantId: req.tenant.id, date: today, status: 'PRESENT' } }),
      prisma.attendance.count({ where: { tenantId: req.tenant.id, date: today } }),
    ]);

    res.json({ date: today, present, total, pct: total > 0 ? Math.round((present / total) * 100) : null });
  } catch (err) { next(err); }
});

// ── GET /api/attendance/my-summary ──────────────────────────────────────────
// The logged-in student's own attendance summary

attendanceRouter.get('/my-summary', async (req, res, next) => {
  try {
    const student = await prisma.student.findFirst({
      where: { tenantId: req.tenant.id, userId: req.user.id },
    });
    if (!student) return res.json({ records: [], pct: null });

    const session = await prisma.academicSession.findFirst({
      where: { tenantId: req.tenant.id, isCurrent: true },
    });
    if (!session) return res.json({ records: [], pct: null });

    const records = await prisma.attendance.findMany({
      where: { tenantId: req.tenant.id, studentId: student.id, sessionId: session.id },
      orderBy: { date: 'desc' },
      take: 30,
    });

    const total   = records.length;
    const present = records.filter(r => r.status === 'PRESENT').length;

    res.json({
      records: records.map(r => ({ date: r.date, status: r.status })),
      pct:     total > 0 ? Math.round((present / total) * 100) : null,
    });
  } catch (err) { next(err); }
});
