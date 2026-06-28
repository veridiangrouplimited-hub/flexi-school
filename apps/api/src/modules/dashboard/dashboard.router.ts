import { Router } from 'express';
import { prisma } from '../../prisma/client';

export const dashboardRouter = Router();

dashboardRouter.get('/stats', async (req, res, next) => {
  try {
    const { role, id: userId } = req.user;
    const tenantId             = req.tenant.id;

    // ── School Admin / Principal ─────────────────────────────────────────────
    if (role === 'SCHOOL_ADMIN' || role === 'PRINCIPAL') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [studentCount, presentToday, totalToday, outstanding, noticeCount, recentNotices] =
        await Promise.all([
          prisma.student.count({ where: { tenantId } }),
          prisma.attendance.count({ where: { tenantId, date: today, status: 'PRESENT' } }),
          prisma.attendance.count({ where: { tenantId, date: today } }),
          prisma.invoice.findMany({
            where:  { tenantId, status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] } },
            select: { totalAmount: true },
          }),
          prisma.notice.count({ where: { tenantId } }),
          prisma.notice.findMany({
            where:   { tenantId },
            orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
            take:    4,
            select:  { id: true, title: true, category: true, isPinned: true, publishedAt: true },
          }),
        ]);

      return res.json({
        role,
        studentCount,
        attendancePct:   totalToday > 0 ? Math.round((presentToday / totalToday) * 100) : null,
        attendanceMarked: totalToday > 0,
        outstandingFees: outstanding.reduce((s, i) => s + Number(i.totalAmount), 0),
        noticeCount,
        recentNotices,
      });
    }

    // ── Teacher ──────────────────────────────────────────────────────────────
    if (role === 'TEACHER') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [classes, session] = await Promise.all([
        prisma.class.findMany({
          where:   { tenantId, session: { isCurrent: true } },
          include: { _count: { select: { students: true } } },
          orderBy: { name: 'asc' },
        }),
        prisma.academicSession.findFirst({ where: { tenantId, isCurrent: true } }),
      ]);

      const markedToday = await prisma.attendance.groupBy({
        by:    ['classId'],
        where: { tenantId, date: today },
        _count: true,
      });
      const markedSet = new Set(markedToday.map(m => m.classId));

      const recentNotices = await prisma.notice.findMany({
        where:   { tenantId },
        orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
        take:    3,
        select:  { id: true, title: true, category: true, isPinned: true, publishedAt: true },
      });

      return res.json({
        role,
        sessionName: session?.name,
        sessionId:   session?.id,
        classes: classes.map(c => ({
          id:           c.id,
          name:         c.name,
          studentCount: c._count.students,
          markedToday:  markedSet.has(c.id),
        })),
        recentNotices,
      });
    }

    // ── Student ──────────────────────────────────────────────────────────────
    if (role === 'STUDENT') {
      const student = await prisma.student.findFirst({ where: { tenantId, userId } });
      const session = await prisma.academicSession.findFirst({ where: { tenantId, isCurrent: true } });

      const [attendanceRecords, invoices, recentScores, recentNotices] = await Promise.all([
        student && session
          ? prisma.attendance.findMany({
              where:   { tenantId, studentId: student.id, sessionId: session.id },
              select:  { status: true },
            })
          : Promise.resolve([]),
        student
          ? prisma.invoice.findMany({
              where:  { tenantId, studentId: student.id },
              select: { totalAmount: true, status: true },
              orderBy: { createdAt: 'desc' },
              take:   5,
            })
          : Promise.resolve([]),
        student
          ? prisma.score.findMany({
              where:   { tenantId, studentId: student.id },
              include: { subject: { select: { name: true, code: true } } },
              orderBy: { submittedAt: 'desc' },
              take:    6,
            })
          : Promise.resolve([]),
        prisma.notice.findMany({
          where:   { tenantId },
          orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
          take:    3,
          select:  { id: true, title: true, category: true, isPinned: true, publishedAt: true },
        }),
      ]);

      const total   = attendanceRecords.length;
      const present = attendanceRecords.filter(r => r.status === 'PRESENT').length;
      const outstanding = invoices
        .filter(i => i.status === 'UNPAID' || i.status === 'PARTIAL' || i.status === 'OVERDUE')
        .reduce((s, i) => s + Number(i.totalAmount), 0);

      return res.json({
        role,
        sessionName:     session?.name,
        attendancePct:   total > 0 ? Math.round((present / total) * 100) : null,
        attendanceDays:  total,
        outstandingFees: outstanding,
        recentScores: recentScores.map(s => ({
          subject: s.subject.name,
          code:    s.subject.code,
          total:   Number(s.total),
          term:    s.term,
        })),
        recentNotices,
      });
    }

    // ── Parent / fallback ─────────────────────────────────────────────────────
    const recentNotices = await prisma.notice.findMany({
      where:   { tenantId },
      orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
      take:    5,
      select:  { id: true, title: true, category: true, isPinned: true, publishedAt: true },
    });

    res.json({ role, recentNotices });
  } catch (err) { next(err); }
});
