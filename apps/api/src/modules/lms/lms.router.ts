import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../prisma/client';
import { requirePermission } from '../../middleware/auth';
import { AppError } from '../../utils/AppError';

export const lmsRouter = Router();

const TERM = z.enum(['FIRST', 'SECOND', 'THIRD']);
const ASSIGNMENT_TYPE = z.enum(['HOMEWORK', 'CLASSWORK', 'ASSIGNMENT', 'PROJECT', 'TEST']);

/** For STUDENT requests, resolve their student record (with class). */
async function resolveStudent(tenantId: string, userId: string) {
  return prisma.student.findFirst({ where: { tenantId, userId } });
}

// ─────────────────────────────────────────────────────────────────────────────
// Class notes
// ─────────────────────────────────────────────────────────────────────────────

lmsRouter.get('/notes', async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    let classId = req.query.classId as string | undefined;

    // Students always see their own class's notes
    if (req.user.role === 'STUDENT') {
      const student = await resolveStudent(tenantId, req.user.id);
      if (!student?.classId) return res.json([]);
      classId = student.classId;
    }

    const notes = await prisma.classNote.findMany({
      where: {
        tenantId,
        ...(classId ? { classId } : {}),
      },
      include: {
        subject: { select: { name: true } },
        class:   { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json(notes.map(n => ({
      id:        n.id,
      title:     n.title,
      body:      n.body,
      subject:   n.subject?.name ?? null,
      className: n.class.name,
      term:      n.term,
      createdAt: n.createdAt,
    })));
  } catch (err) { next(err); }
});

const noteSchema = z.object({
  classId:   z.string().uuid(),
  subjectId: z.string().uuid().optional(),
  sessionId: z.string().uuid(),
  term:      TERM,
  title:     z.string().min(1).max(200),
  body:      z.string().min(1).max(20000),
});

lmsRouter.post('/notes', requirePermission('academic:write'), async (req, res, next) => {
  try {
    const data = noteSchema.parse(req.body);
    const note = await prisma.classNote.create({
      data: { ...data, tenantId: req.tenant.id, authorId: req.user.id },
    });
    res.status(201).json(note);
  } catch (err) { next(err); }
});

lmsRouter.delete('/notes/:id', requirePermission('academic:write'), async (req, res, next) => {
  try {
    const note = await prisma.classNote.findFirst({
      where: { id: req.params.id, tenantId: req.tenant.id },
    });
    if (!note) throw new AppError('Note not found', 404, 'NOT_FOUND');
    await prisma.classNote.delete({ where: { id: note.id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// Assignments
// ─────────────────────────────────────────────────────────────────────────────

lmsRouter.get('/assignments', async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    let classId   = req.query.classId as string | undefined;
    let studentId: string | null = null;

    if (req.user.role === 'STUDENT') {
      const student = await resolveStudent(tenantId, req.user.id);
      if (!student?.classId) return res.json([]);
      classId   = student.classId;
      studentId = student.id;
    }

    const assignments = await prisma.assignment.findMany({
      where: {
        tenantId,
        ...(classId ? { classId } : {}),
      },
      include: {
        subject: { select: { name: true } },
        class:   { select: { name: true } },
        _count:  { select: { submissions: true } },
        ...(studentId ? {
          submissions: {
            where:  { studentId },
            select: { id: true, content: true, submittedAt: true, score: true, feedback: true, gradedAt: true },
          },
        } : {}),
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      take: 100,
    });

    res.json(assignments.map(a => ({
      id:              a.id,
      title:           a.title,
      instructions:    a.instructions,
      type:            a.type,
      dueDate:         a.dueDate,
      maxScore:        a.maxScore,
      subject:         a.subject?.name ?? null,
      className:       a.class.name,
      term:            a.term,
      createdAt:       a.createdAt,
      submissionCount: a._count.submissions,
      mySubmission:    studentId ? ((a as { submissions?: unknown[] }).submissions?.[0] ?? null) : undefined,
    })));
  } catch (err) { next(err); }
});

const assignmentSchema = z.object({
  classId:      z.string().uuid(),
  subjectId:    z.string().uuid().optional(),
  sessionId:    z.string().uuid(),
  term:         TERM,
  type:         ASSIGNMENT_TYPE,
  title:        z.string().min(1).max(200),
  instructions: z.string().min(1).max(20000),
  dueDate:      z.string().datetime().optional(),
  maxScore:     z.number().int().min(1).max(1000).default(100),
});

lmsRouter.post('/assignments', requirePermission('academic:write'), async (req, res, next) => {
  try {
    const data = assignmentSchema.parse(req.body);
    const assignment = await prisma.assignment.create({
      data: {
        ...data,
        dueDate:  data.dueDate ? new Date(data.dueDate) : undefined,
        tenantId: req.tenant.id,
        authorId: req.user.id,
      },
    });
    res.status(201).json(assignment);
  } catch (err) { next(err); }
});

lmsRouter.delete('/assignments/:id', requirePermission('academic:write'), async (req, res, next) => {
  try {
    const assignment = await prisma.assignment.findFirst({
      where: { id: req.params.id, tenantId: req.tenant.id },
    });
    if (!assignment) throw new AppError('Assignment not found', 404, 'NOT_FOUND');
    await prisma.assignment.delete({ where: { id: assignment.id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// Submissions
// ─────────────────────────────────────────────────────────────────────────────

const submitSchema = z.object({
  content: z.string().min(1).max(20000),
});

// Student submits (or re-submits before grading)
lmsRouter.post('/assignments/:id/submit', async (req, res, next) => {
  try {
    if (req.user.role !== 'STUDENT') {
      throw new AppError('Only students can submit', 403, 'FORBIDDEN');
    }
    const { content } = submitSchema.parse(req.body);
    const tenantId = req.tenant.id;

    const student = await resolveStudent(tenantId, req.user.id);
    if (!student) throw new AppError('Student record not found', 404, 'NOT_FOUND');

    const assignment = await prisma.assignment.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!assignment) throw new AppError('Assignment not found', 404, 'NOT_FOUND');
    if (assignment.classId !== student.classId) {
      throw new AppError('This assignment is not for your class', 403, 'FORBIDDEN');
    }

    const existing = await prisma.submission.findUnique({
      where: { assignmentId_studentId: { assignmentId: assignment.id, studentId: student.id } },
    });
    if (existing?.gradedAt) {
      throw new AppError('Submission already graded — contact your teacher', 409, 'ALREADY_GRADED');
    }

    const submission = existing
      ? await prisma.submission.update({
          where: { id: existing.id },
          data:  { content, submittedAt: new Date() },
        })
      : await prisma.submission.create({
          data: { tenantId, assignmentId: assignment.id, studentId: student.id, content },
        });

    res.status(201).json(submission);
  } catch (err) { next(err); }
});

// Teacher lists submissions for an assignment
lmsRouter.get('/assignments/:id/submissions', requirePermission('academic:write'), async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const assignment = await prisma.assignment.findFirst({
      where:   { id: req.params.id, tenantId },
      include: { class: { include: { students: { include: { user: { select: { profile: true } } } } } } },
    });
    if (!assignment) throw new AppError('Assignment not found', 404, 'NOT_FOUND');

    const submissions = await prisma.submission.findMany({
      where:   { assignmentId: assignment.id, tenantId },
      orderBy: { submittedAt: 'asc' },
    });
    const byStudent = new Map(submissions.map(s => [s.studentId, s]));

    // Full roll: every student in the class with their submission (or null)
    const roll = assignment.class.students
      .sort((a, b) => a.admissionNo.localeCompare(b.admissionNo))
      .map(st => {
        const sub = byStudent.get(st.id);
        return {
          studentId:   st.id,
          admissionNo: st.admissionNo,
          name:        ((st.user?.profile as Record<string, unknown>)?.fullName as string) ?? st.admissionNo,
          submission:  sub ? {
            id:          sub.id,
            content:     sub.content,
            submittedAt: sub.submittedAt,
            score:       sub.score,
            feedback:    sub.feedback,
            gradedAt:    sub.gradedAt,
          } : null,
        };
      });

    res.json({
      assignment: {
        id: assignment.id, title: assignment.title, type: assignment.type,
        maxScore: assignment.maxScore, dueDate: assignment.dueDate,
        className: assignment.class.name,
      },
      roll,
    });
  } catch (err) { next(err); }
});

const gradeSchema = z.object({
  score:    z.number().int().min(0),
  feedback: z.string().max(5000).optional(),
});

// Teacher grades a submission
lmsRouter.patch('/submissions/:id/grade', requirePermission('academic:write'), async (req, res, next) => {
  try {
    const { score, feedback } = gradeSchema.parse(req.body);
    const submission = await prisma.submission.findFirst({
      where:   { id: req.params.id, tenantId: req.tenant.id },
      include: { assignment: { select: { maxScore: true } } },
    });
    if (!submission) throw new AppError('Submission not found', 404, 'NOT_FOUND');
    if (score > submission.assignment.maxScore) {
      throw new AppError(`Score cannot exceed max score of ${submission.assignment.maxScore}`, 400, 'SCORE_TOO_HIGH');
    }

    const updated = await prisma.submission.update({
      where: { id: submission.id },
      data:  { score, feedback: feedback ?? null, gradedBy: req.user.id, gradedAt: new Date() },
    });
    res.json(updated);
  } catch (err) { next(err); }
});
