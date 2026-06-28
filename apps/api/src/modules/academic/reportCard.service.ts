import { prisma } from '../../prisma/client';

interface ReportCardInput {
  studentId: string;
  sessionId: string;
  term: 'FIRST' | 'SECOND' | 'THIRD';
  tenantId: string;
}

export interface SubjectResult {
  subjectName: string;
  subjectCode: string | null;
  components: Record<string, number>;
  total: number;
  grade: string;
  remark: string;
  gradePoints: number;
  position: number | null;
  classSize: number;
}

export interface ReportCard {
  student: {
    name: string;
    admissionNo: string;
    class: string | null;
    session: string | null;
    term: string;
  };
  results: SubjectResult[];
  summary: {
    totalScore: number;
    average: number;
    gpa: number;
    subjectCount: number;
    overallPosition: number | null;
    classSize: number;
  };
}

type GradeBand = {
  min: number;
  max: number;
  grade: string;
  remark: string;
  points: number;
};

export async function generateReportCard(
  input: ReportCardInput,
): Promise<ReportCard> {
  const { studentId, sessionId, term } = input;

  const student = await prisma.student.findUniqueOrThrow({
    where: { id: studentId },
    include: {
      user: { select: { profile: true } },
      class: { include: { session: true } },
    },
  });

  const scores = await prisma.score.findMany({
    where: { studentId, sessionId, term },
    include: {
      subject: { include: { gradingScale: true } },
    },
  });

  // Fetch all classmates' scores to compute positions
  const classScores = await prisma.score.findMany({
    where: {
      sessionId,
      term,
      student: { classId: student.classId ?? undefined },
    },
    select: { studentId: true, total: true, subjectId: true },
  });

  const classSize = new Set(classScores.map((s) => s.studentId)).size;
  const subjectPositions = computeSubjectPositions(classScores, studentId);
  const overallPosition = computeOverallPosition(classScores, studentId);

  const results: SubjectResult[] = scores.map((score) => {
    const total = Number(score.total);
    const bands: GradeBand[] =
      (score.subject.gradingScale?.bands as GradeBand[] | null) ??
      defaultBands();
    const band = bands.find((b) => total >= b.min && total <= b.max);

    return {
      subjectName:  score.subject.name,
      subjectCode:  score.subject.code,
      components:   score.components as Record<string, number>,
      total,
      grade:        band?.grade   ?? 'F',
      remark:       band?.remark  ?? 'Fail',
      gradePoints:  band?.points  ?? 0,
      position:     subjectPositions.get(score.subjectId) ?? null,
      classSize,
    };
  });

  const totalScore = results.reduce((a, r) => a + r.total, 0);
  const gpaSum     = results.reduce((a, r) => a + r.gradePoints, 0);
  const count      = results.length || 1;

  return {
    student: {
      name:        ((student.user?.profile as Record<string, unknown>)?.fullName as string) ?? 'Unknown',
      admissionNo: student.admissionNo,
      class:       student.class?.name   ?? null,
      session:     student.class?.session?.name ?? null,
      term,
    },
    results,
    summary: {
      totalScore,
      average:         Number((totalScore / count).toFixed(2)),
      gpa:             Number((gpaSum     / count).toFixed(2)),
      subjectCount:    results.length,
      overallPosition,
      classSize,
    },
  };
}

function computeSubjectPositions(
  allScores: { studentId: string; total: unknown; subjectId: string }[],
  targetStudentId: string,
): Map<string, number> {
  const bySubject = new Map<string, { studentId: string; total: number }[]>();

  for (const s of allScores) {
    const list = bySubject.get(s.subjectId) ?? [];
    list.push({ studentId: s.studentId, total: Number(s.total) });
    bySubject.set(s.subjectId, list);
  }

  const positions = new Map<string, number>();
  for (const [subjectId, entries] of bySubject) {
    const sorted = [...entries].sort((a, b) => b.total - a.total);
    const idx = sorted.findIndex((e) => e.studentId === targetStudentId);
    if (idx !== -1) positions.set(subjectId, idx + 1);
  }
  return positions;
}

function computeOverallPosition(
  allScores: { studentId: string; total: unknown }[],
  targetStudentId: string,
): number | null {
  const totals = new Map<string, number>();
  for (const s of allScores) {
    totals.set(s.studentId, (totals.get(s.studentId) ?? 0) + Number(s.total));
  }
  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const idx = sorted.findIndex(([id]) => id === targetStudentId);
  return idx === -1 ? null : idx + 1;
}

function defaultBands(): GradeBand[] {
  return [
    { min: 70, max: 100, grade: 'A', remark: 'Excellent',  points: 5.0 },
    { min: 60, max: 69,  grade: 'B', remark: 'Very Good',  points: 4.0 },
    { min: 50, max: 59,  grade: 'C', remark: 'Good',       points: 3.0 },
    { min: 40, max: 49,  grade: 'D', remark: 'Pass',       points: 2.0 },
    { min: 0,  max: 39,  grade: 'F', remark: 'Fail',       points: 0.0 },
  ];
}
