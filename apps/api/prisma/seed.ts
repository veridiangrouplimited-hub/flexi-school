import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database…');

  // Clear in dependency order
  await prisma.hostelAllocation.deleteMany();
  await prisma.score.deleteMany();
  await prisma.caWeight.deleteMany();
  await prisma.bed.deleteMany();
  await prisma.dormitory.deleteMany();
  await prisma.student.deleteMany();
  await prisma.sportsHouse.deleteMany();
  await prisma.sportsEvent.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.gradingScale.deleteMany();
  await prisma.class.deleteMany();
  await prisma.academicSession.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.tenant.deleteMany();

  // ── Tenant ────────────────────────────────────────────────────────────────
  const tenant = await prisma.tenant.create({
    data: {
      name:         'Kings College Lagos',
      subdomain:    'kings-college',
      level:        'SECONDARY',
      boardingType: 'HYBRID',
      subStatus:    'ACTIVE',
      subTier:      'ENTERPRISE',
      featureFlags: { sports: true, alumni: true },
      branding:     { primaryColor: '#15803d', schoolMotto: 'In omnia paratus' },
    },
  });

  // ── Roles ─────────────────────────────────────────────────────────────────
  const adminRole = await prisma.role.create({
    data: {
      tenantId:    tenant.id,
      name:        'SCHOOL_ADMIN',
      permissions: [
        'academic:read', 'academic:write',
        'hostel:read', 'hostel:write',
        'finance:read', 'finance:write',
        'settings:read', 'settings:write',
        'students:read', 'students:write', 'students:delete',
      ],
    },
  });

  const teacherRole = await prisma.role.create({
    data: {
      tenantId:    tenant.id,
      name:        'TEACHER',
      permissions: ['academic:read', 'academic:write', 'students:read'],
    },
  });

  const studentRole = await prisma.role.create({
    data: {
      tenantId:    tenant.id,
      name:        'STUDENT',
      permissions: ['academic:read'],
    },
  });

  // ── Users ─────────────────────────────────────────────────────────────────
  const [adminHash, teacherHash, studentHash] = await Promise.all([
    bcrypt.hash('Admin1234!', 10),
    bcrypt.hash('Teacher1234!', 10),
    bcrypt.hash('Student1234!', 10),
  ]);

  const adminUser = await prisma.user.create({
    data: {
      tenantId:     tenant.id,
      email:        'admin@demo.flexischool.app',
      passwordHash: adminHash,
      roleId:       adminRole.id,
      profile:      { fullName: 'Dr. Adebayo Okonkwo', position: 'Principal' },
    },
  });

  const teacherUser = await prisma.user.create({
    data: {
      tenantId:     tenant.id,
      email:        'teacher@demo.flexischool.app',
      passwordHash: teacherHash,
      roleId:       teacherRole.id,
      profile:      { fullName: 'Mrs. Chioma Eze', department: 'Sciences' },
    },
  });

  // ── Grading scale ─────────────────────────────────────────────────────────
  const gradingScale = await prisma.gradingScale.create({
    data: {
      tenantId: tenant.id,
      name:     'WAEC Standard',
      bands: [
        { min: 70, max: 100, grade: 'A1', remark: 'Excellent', points: 5.0 },
        { min: 65, max: 69,  grade: 'B2', remark: 'Very Good', points: 4.0 },
        { min: 60, max: 64,  grade: 'B3', remark: 'Good',      points: 3.5 },
        { min: 55, max: 59,  grade: 'C4', remark: 'Credit',    points: 3.0 },
        { min: 50, max: 54,  grade: 'C5', remark: 'Credit',    points: 2.5 },
        { min: 45, max: 49,  grade: 'C6', remark: 'Credit',    points: 2.0 },
        { min: 40, max: 44,  grade: 'D7', remark: 'Pass',      points: 1.5 },
        { min: 35, max: 39,  grade: 'E8', remark: 'Pass',      points: 1.0 },
        { min: 0,  max: 34,  grade: 'F9', remark: 'Fail',      points: 0.0 },
      ],
    },
  });

  // ── Academic session ──────────────────────────────────────────────────────
  const session = await prisma.academicSession.create({
    data: {
      tenantId:  tenant.id,
      name:      '2024/2025',
      startDate: new Date('2024-09-01'),
      endDate:   new Date('2025-07-31'),
      isCurrent: true,
    },
  });

  // ── Classes ───────────────────────────────────────────────────────────────
  const [class1, class2] = await Promise.all([
    prisma.class.create({ data: { tenantId: tenant.id, name: 'JS1A', level: 'JSS1', arm: 'A', sessionId: session.id } }),
    prisma.class.create({ data: { tenantId: tenant.id, name: 'SS2B', level: 'SSS2', arm: 'B', sessionId: session.id } }),
  ]);

  // ── Subjects ──────────────────────────────────────────────────────────────
  const subjects = await Promise.all([
    prisma.subject.create({ data: { tenantId: tenant.id, name: 'Mathematics',     code: 'MTH', gradingScaleId: gradingScale.id } }),
    prisma.subject.create({ data: { tenantId: tenant.id, name: 'English Language', code: 'ENG', gradingScaleId: gradingScale.id } }),
    prisma.subject.create({ data: { tenantId: tenant.id, name: 'Physics',          code: 'PHY', department: 'Sciences', gradingScaleId: gradingScale.id } }),
    prisma.subject.create({ data: { tenantId: tenant.id, name: 'Chemistry',        code: 'CHE', department: 'Sciences', gradingScaleId: gradingScale.id } }),
    prisma.subject.create({ data: { tenantId: tenant.id, name: 'Biology',          code: 'BIO', department: 'Sciences', gradingScaleId: gradingScale.id } }),
  ]);

  // ── Students ──────────────────────────────────────────────────────────────
  const [su1, su2] = await Promise.all([
    prisma.user.create({
      data: {
        tenantId: tenant.id, email: 'student1@demo.flexischool.app',
        passwordHash: studentHash, roleId: studentRole.id,
        profile: { fullName: 'Chukwuemeka Obi' },
      },
    }),
    prisma.user.create({
      data: {
        tenantId: tenant.id, email: 'student2@demo.flexischool.app',
        passwordHash: studentHash, roleId: studentRole.id,
        profile: { fullName: 'Fatima Abubakar' },
      },
    }),
  ]);

  const [student1] = await Promise.all([
    prisma.student.create({
      data: { tenantId: tenant.id, userId: su1.id, admissionNo: 'KCL/2024/001', classId: class2.id, boardingStatus: 'BOARDER' },
    }),
    prisma.student.create({
      data: { tenantId: tenant.id, userId: su2.id, admissionNo: 'KCL/2024/002', classId: class1.id, boardingStatus: 'DAY' },
    }),
  ]);

  // ── Scores for student1 (First Term) ─────────────────────────────────────
  const scoreRows = [
    { subjectId: subjects[0].id, components: { CA: 28, Exam: 50 }, total: 78 },
    { subjectId: subjects[1].id, components: { CA: 25, Exam: 46 }, total: 71 },
    { subjectId: subjects[2].id, components: { CA: 30, Exam: 52 }, total: 82 },
    { subjectId: subjects[3].id, components: { CA: 22, Exam: 46 }, total: 68 },
    { subjectId: subjects[4].id, components: { CA: 27, Exam: 53 }, total: 80 },
  ];

  for (const row of scoreRows) {
    await prisma.score.create({
      data: {
        tenantId:    tenant.id,
        studentId:   student1.id,
        sessionId:   session.id,
        term:        'FIRST',
        submittedBy: teacherUser.id,
        ...row,
      },
    });
  }

  // ── Dormitories + Beds ────────────────────────────────────────────────────
  const [boysDorm, girlsDorm] = await Promise.all([
    prisma.dormitory.create({ data: { tenantId: tenant.id, name: 'Nelson Mandela House', gender: 'MALE',   capacity: 50 } }),
    prisma.dormitory.create({ data: { tenantId: tenant.id, name: 'Wangari Maathai House', gender: 'FEMALE', capacity: 50 } }),
  ]);

  for (let room = 1; room <= 2; room++) {
    for (let bed = 1; bed <= 5; bed++) {
      await prisma.bed.create({ data: { tenantId: tenant.id, dormitoryId: boysDorm.id,  roomNumber: `B${room}`, bedNumber: `${bed}`, status: 'VACANT' } });
      await prisma.bed.create({ data: { tenantId: tenant.id, dormitoryId: girlsDorm.id, roomNumber: `G${room}`, bedNumber: `${bed}`, status: 'VACANT' } });
    }
  }

  // ── Print credentials ─────────────────────────────────────────────────────
  console.log('\nSeed complete ✓');
  console.log('─────────────────────────────────────────');
  console.log('  Admin:   admin@demo.flexischool.app   / Admin1234!');
  console.log('  Teacher: teacher@demo.flexischool.app / Teacher1234!');
  console.log('  Student: student1@demo.flexischool.app / Student1234!');
  console.log('─────────────────────────────────────────');

  void adminUser; void class1;
}

main().catch(console.error).finally(() => prisma.$disconnect());
