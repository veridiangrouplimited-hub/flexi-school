import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma/client';
import { requirePermission } from '../../middleware/auth';
import { generateReportCard } from './reportCard.service';

export const academicRouter = Router();

// Sessions
academicRouter.get('/sessions', async (req, res, next) => {
  try {
    const sessions = await prisma.academicSession.findMany({
      where: { tenantId: req.tenant.id },
      orderBy: [{ isCurrent: 'desc' }, { startDate: 'desc' }],
    });
    res.json(sessions);
  } catch (err) { next(err); }
});

// Classes
academicRouter.get('/classes', async (req, res, next) => {
  try {
    const { sessionId } = req.query;
    const classes = await prisma.class.findMany({
      where: {
        tenantId: req.tenant.id,
        ...(sessionId ? { sessionId: sessionId as string } : {}),
      },
      include: { _count: { select: { students: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(classes);
  } catch (err) { next(err); }
});

// Subjects
academicRouter.get('/subjects', async (req, res, next) => {
  try {
    const subjects = await prisma.subject.findMany({
      where: { tenantId: req.tenant.id },
      orderBy: { name: 'asc' },
    });
    res.json(subjects);
  } catch (err) { next(err); }
});

// Students
academicRouter.get('/students', async (req, res, next) => {
  try {
    const { classId } = req.query;
    const students = await prisma.student.findMany({
      where: {
        tenantId: req.tenant.id,
        ...(classId ? { classId: classId as string } : {}),
      },
      include: { user: { select: { profile: true } } },
      orderBy: { admissionNo: 'asc' },
    });
    res.json(students.map((s) => ({
      id:             s.id,
      admissionNo:    s.admissionNo,
      name:           ((s.user?.profile as Record<string, unknown>)?.fullName as string) ?? s.admissionNo,
      boardingStatus: s.boardingStatus,
      classId:        s.classId,
    })));
  } catch (err) { next(err); }
});

// Report card
const reportCardQuery = z.object({
  studentId: z.string().uuid(),
  sessionId: z.string().uuid(),
  term:      z.enum(['FIRST', 'SECOND', 'THIRD']),
});

academicRouter.get('/report-card', async (req, res, next) => {
  try {
    const { studentId, sessionId, term } = reportCardQuery.parse(req.query);
    const card = await generateReportCard({ studentId, sessionId, term, tenantId: req.tenant.id });
    res.json(card);
  } catch (err) { next(err); }
});

// Batch report cards — whole class, or whole school when classId is omitted
const batchReportCardQuery = z.object({
  classId:   z.string().uuid().optional(),
  sessionId: z.string().uuid(),
  term:      z.enum(['FIRST', 'SECOND', 'THIRD']),
});

academicRouter.get('/report-cards', async (req, res, next) => {
  try {
    const { classId, sessionId, term } = batchReportCardQuery.parse(req.query);

    const students = await prisma.student.findMany({
      where: {
        tenantId: req.tenant.id,
        ...(classId ? { classId } : { classId: { not: null } }),
      },
      orderBy: { admissionNo: 'asc' },
      select:  { id: true },
    });

    const cards = [];
    for (const s of students) {
      const card = await generateReportCard({
        studentId: s.id, sessionId, term, tenantId: req.tenant.id,
      });
      // Only include students who actually have scores for this term
      if (card.results.length > 0) cards.push(card);
    }

    res.json({
      cards,
      total:   students.length,
      skipped: students.length - cards.length,
    });
  } catch (err) { next(err); }
});

// Scores — list
academicRouter.get('/scores', async (req, res, next) => {
  try {
    const { studentId, sessionId, term } = req.query;
    const scores = await prisma.score.findMany({
      where: {
        tenantId: req.tenant.id,
        ...(studentId ? { studentId: studentId as string } : {}),
        ...(sessionId ? { sessionId: sessionId as string } : {}),
        ...(term      ? { term: term as 'FIRST' | 'SECOND' | 'THIRD' } : {}),
      },
      include: { subject: { select: { name: true, code: true } } },
    });
    res.json(scores);
  } catch (err) { next(err); }
});

// Scores — submit
const scoreSchema = z.object({
  studentId:  z.string().uuid(),
  subjectId:  z.string().uuid(),
  sessionId:  z.string().uuid(),
  term:       z.enum(['FIRST', 'SECOND', 'THIRD']),
  components: z.record(z.number().min(0).max(100)),
  total:      z.number().min(0).max(100),
});

academicRouter.post('/scores', requirePermission('academic:write'), async (req, res, next) => {
  try {
    const data = scoreSchema.parse(req.body);
    const score = await prisma.score.upsert({
      where: {
        tenantId_studentId_subjectId_sessionId_term: {
          tenantId:  req.tenant.id,
          studentId: data.studentId,
          subjectId: data.subjectId,
          sessionId: data.sessionId,
          term:      data.term,
        },
      },
      create: {
        tenantId:    req.tenant.id,
        submittedBy: req.user.id,
        ...data,
      },
      update: {
        components:  data.components,
        total:       data.total,
        submittedBy: req.user.id,
        submittedAt: new Date(),
      },
    });
    res.status(201).json(score);
  } catch (err) { next(err); }
});
