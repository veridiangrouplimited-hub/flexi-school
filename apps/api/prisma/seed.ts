import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database…');

  // Clear in dependency order
  await prisma.notice.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.feeCategory.deleteMany();
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
      featureFlags: { sports: true, alumni: true, finance: true },
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

  const [student1, student2] = await Promise.all([
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

  // ── Attendance (last 10 school days for both students) ───────────────────
  const [student2Record] = [
    await prisma.student.findFirst({ where: { tenantId: tenant.id, userId: su2.id } }),
  ];

  const attendanceDates = Array.from({ length: 10 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    return d;
  }).filter(d => d.getDay() !== 0 && d.getDay() !== 6); // skip weekends

  for (const date of attendanceDates) {
    const s1Status = Math.random() > 0.1 ? 'PRESENT' : 'ABSENT';
    const s2Status = Math.random() > 0.2 ? 'PRESENT' : 'LATE';
    await prisma.attendance.createMany({
      data: [
        { tenantId: tenant.id, classId: class2.id, sessionId: session.id, date, studentId: student1.id, status: s1Status as 'PRESENT' | 'ABSENT', markedBy: teacherUser.id },
        { tenantId: tenant.id, classId: class1.id, sessionId: session.id, date, studentId: student2Record!.id, status: s2Status as 'PRESENT' | 'LATE', markedBy: teacherUser.id },
      ],
      skipDuplicates: true,
    });
  }

  // ── Notices ────────────────────────────────────────────────────────────────
  await prisma.notice.createMany({
    data: [
      {
        tenantId:    tenant.id,
        title:       'Welcome Back — 2024/2025 Academic Session',
        body:        'We warmly welcome all students, parents, and staff to the new academic session. Classes commence Monday 9th September. Please ensure all fees are settled before the end of the first week.',
        category:    'GENERAL',
        isPinned:    true,
        targetRoles: [],
        authorId:    adminUser.id,
      },
      {
        tenantId:    tenant.id,
        title:       'First Term Examination Timetable',
        body:        'The First Term examinations will commence on 25th November 2024. All students are required to be in school by 7:30 AM on examination days. Parents are advised to ensure prompt settlement of exam fees.',
        category:    'ACADEMIC',
        isPinned:    false,
        targetRoles: ['STUDENT', 'PARENT'],
        authorId:    adminUser.id,
        expiresAt:   new Date('2024-12-01'),
      },
      {
        tenantId:    tenant.id,
        title:       'Fee Payment Deadline — First Term',
        body:        'This is a reminder that all First Term fees (Tuition, Books, Uniform, Lab, Exam) must be paid by 1st October 2024. Students with outstanding balances after this date may be excluded from examinations.',
        category:    'FINANCE',
        isPinned:    false,
        targetRoles: ['PARENT', 'STUDENT'],
        authorId:    adminUser.id,
      },
      {
        tenantId:    tenant.id,
        title:       'Inter-House Sports Day — Save the Date',
        body:        'Inter-House Sports Day is scheduled for Saturday 14th December 2024 at the school sports ground. All students are encouraged to participate. Contact the Sports Master to register for events.',
        category:    'SPORTS',
        isPinned:    false,
        targetRoles: [],
        authorId:    adminUser.id,
      },
      {
        tenantId:    tenant.id,
        title:       'Hostel Check-in for Boarders',
        body:        'All boarders are to report to their respective dormitory housemasters by 4:00 PM on Sunday 8th September. Please come with your allocation letter and bedding.',
        category:    'HOSTEL',
        isPinned:    false,
        targetRoles: ['STUDENT'],
        authorId:    adminUser.id,
      },
    ],
  });

  // ── Fee categories ────────────────────────────────────────────────────────
  const [catFees, catBooks, catUniform, catLab, catExam] = await Promise.all([
    prisma.feeCategory.create({ data: { tenantId: tenant.id, name: 'School Fees',   description: 'Tuition for the term',            defaultAmount: 500.00 } }),
    prisma.feeCategory.create({ data: { tenantId: tenant.id, name: 'Books',         description: 'Prescribed textbooks & materials', defaultAmount:  80.00 } }),
    prisma.feeCategory.create({ data: { tenantId: tenant.id, name: 'Uniform',       description: 'School uniform set',               defaultAmount:  60.00 } }),
    prisma.feeCategory.create({ data: { tenantId: tenant.id, name: 'Lab Fee',       description: 'Science laboratory usage',         defaultAmount:  40.00 } }),
    prisma.feeCategory.create({ data: { tenantId: tenant.id, name: 'Exam Fee',      description: 'End-of-term examination fee',      defaultAmount:  30.00 } }),
  ]);

  // ── Invoice 1 — PAID (student1, First Term) ───────────────────────────────
  const invoice1 = await prisma.invoice.create({
    data: {
      tenantId:    tenant.id,
      studentId:   student1.id,
      sessionId:   session.id,
      term:        'FIRST',
      status:      'PAID',
      totalAmount: 710.00,
      dueDate:     new Date('2024-10-01'),
      notes:       'Full payment received',
      items: {
        create: [
          { tenantId: tenant.id, feeCategoryId: catFees.id,    description: 'First Term Tuition', amount: 500.00 },
          { tenantId: tenant.id, feeCategoryId: catBooks.id,   description: null,                 amount:  80.00 },
          { tenantId: tenant.id, feeCategoryId: catUniform.id, description: null,                 amount:  60.00 },
          { tenantId: tenant.id, feeCategoryId: catExam.id,    description: null,                 amount:  30.00 },
          { tenantId: tenant.id, feeCategoryId: catLab.id,     description: null,                 amount:  40.00 },
        ],
      },
    },
  });

  // Payment record for invoice1
  await prisma.payment.create({
    data: {
      tenantId:      tenant.id,
      invoiceId:     invoice1.id,
      amount:        710.00,
      currency:      'USD',
      gateway:       'PAYPAL',
      gatewayRef:    'PAYPAL-DEMO-ORDER-001',
      gatewayStatus: 'COMPLETED',
      status:        'COMPLETED',
      paidAt:        new Date('2024-09-15'),
    },
  });

  // ── Invoice 2 — UNPAID (student2, First Term) ──────────────────────────────
  await prisma.invoice.create({
    data: {
      tenantId:    tenant.id,
      studentId:   student2.id,
      sessionId:   session.id,
      term:        'FIRST',
      status:      'UNPAID',
      totalAmount: 640.00,
      dueDate:     new Date('2024-10-01'),
      notes:       null,
      items: {
        create: [
          { tenantId: tenant.id, feeCategoryId: catFees.id,    description: 'First Term Tuition', amount: 500.00 },
          { tenantId: tenant.id, feeCategoryId: catBooks.id,   description: null,                 amount:  80.00 },
          { tenantId: tenant.id, feeCategoryId: catExam.id,    description: null,                 amount:  30.00 },
          { tenantId: tenant.id, feeCategoryId: catLab.id,     description: null,                 amount:  40.00 },
        ],
      },
    },
  });

  // ── Invoice 3 — OVERDUE (student1, Second Term) ────────────────────────────
  await prisma.invoice.create({
    data: {
      tenantId:    tenant.id,
      studentId:   student1.id,
      sessionId:   session.id,
      term:        'SECOND',
      status:      'OVERDUE',
      totalAmount: 580.00,
      dueDate:     new Date('2025-02-01'),
      notes:       'Payment overdue — please settle immediately',
      items: {
        create: [
          { tenantId: tenant.id, feeCategoryId: catFees.id,  description: 'Second Term Tuition', amount: 500.00 },
          { tenantId: tenant.id, feeCategoryId: catExam.id,  description: null,                  amount:  30.00 },
          { tenantId: tenant.id, feeCategoryId: catLab.id,   description: null,                  amount:  40.00 },
          { tenantId: tenant.id, feeCategoryId: catUniform.id, description: 'Replacement set',   amount:  10.00 },
        ],
      },
    },
  });

  // ── 20 Additional students ────────────────────────────────────────────────
  const extraDefs: { name: string; admNo: string; cls: 'c1' | 'c2'; boarding: 'DAY' | 'BOARDER'; gender: 'M' | 'F' }[] = [
    // JS1A (class1) — 10 students
    { name: 'Adewale Ogundimu',   admNo: 'KCL/2024/003', cls: 'c1', boarding: 'DAY',     gender: 'M' },
    { name: 'Ngozi Ike',          admNo: 'KCL/2024/004', cls: 'c1', boarding: 'DAY',     gender: 'F' },
    { name: 'Emeka Nwosu',        admNo: 'KCL/2024/005', cls: 'c1', boarding: 'DAY',     gender: 'M' },
    { name: 'Amina Hassan',       admNo: 'KCL/2024/006', cls: 'c1', boarding: 'BOARDER', gender: 'F' },
    { name: 'Tunde Adeyemi',      admNo: 'KCL/2024/007', cls: 'c1', boarding: 'DAY',     gender: 'M' },
    { name: 'Tolani Oyelaran',    admNo: 'KCL/2024/008', cls: 'c1', boarding: 'DAY',     gender: 'F' },
    { name: 'Yusuf Musa',         admNo: 'KCL/2024/009', cls: 'c1', boarding: 'BOARDER', gender: 'M' },
    { name: 'Nkechi Obi',         admNo: 'KCL/2024/010', cls: 'c1', boarding: 'DAY',     gender: 'F' },
    { name: 'Kingsley Eze',       admNo: 'KCL/2024/011', cls: 'c1', boarding: 'DAY',     gender: 'M' },
    { name: 'Zainab Yusuf',       admNo: 'KCL/2024/012', cls: 'c1', boarding: 'BOARDER', gender: 'F' },
    // SS2B (class2) — 10 students
    { name: 'Babatunde Olawale',  admNo: 'KCL/2024/013', cls: 'c2', boarding: 'BOARDER', gender: 'M' },
    { name: 'Adaeze Chukwu',      admNo: 'KCL/2024/014', cls: 'c2', boarding: 'DAY',     gender: 'F' },
    { name: 'Chidera Okafor',     admNo: 'KCL/2024/015', cls: 'c2', boarding: 'BOARDER', gender: 'M' },
    { name: 'Blessing Adewale',   admNo: 'KCL/2024/016', cls: 'c2', boarding: 'DAY',     gender: 'F' },
    { name: 'Seun Adesanya',      admNo: 'KCL/2024/017', cls: 'c2', boarding: 'BOARDER', gender: 'M' },
    { name: 'Funmilayo Oduya',    admNo: 'KCL/2024/018', cls: 'c2', boarding: 'DAY',     gender: 'F' },
    { name: 'Ibrahim Sani',       admNo: 'KCL/2024/019', cls: 'c2', boarding: 'BOARDER', gender: 'M' },
    { name: 'Chiamaka Nwankwo',   admNo: 'KCL/2024/020', cls: 'c2', boarding: 'BOARDER', gender: 'F' },
    { name: 'Oluwaseun Balogun',  admNo: 'KCL/2024/021', cls: 'c2', boarding: 'DAY',     gender: 'M' },
    { name: 'Hadiza Usman',       admNo: 'KCL/2024/022', cls: 'c2', boarding: 'BOARDER', gender: 'F' },
  ];

  // Fixed score sets for SS2B students (realistic variation)
  const ss2bScores = [
    [{ ca: 30, ex: 55 }, { ca: 28, ex: 50 }, { ca: 25, ex: 48 }, { ca: 32, ex: 57 }, { ca: 29, ex: 54 }],
    [{ ca: 22, ex: 40 }, { ca: 20, ex: 38 }, { ca: 24, ex: 42 }, { ca: 18, ex: 36 }, { ca: 21, ex: 39 }],
    [{ ca: 27, ex: 52 }, { ca: 25, ex: 49 }, { ca: 30, ex: 55 }, { ca: 26, ex: 50 }, { ca: 28, ex: 53 }],
    [{ ca: 35, ex: 60 }, { ca: 33, ex: 58 }, { ca: 30, ex: 55 }, { ca: 34, ex: 62 }, { ca: 32, ex: 57 }],
    [{ ca: 18, ex: 30 }, { ca: 15, ex: 28 }, { ca: 20, ex: 35 }, { ca: 14, ex: 26 }, { ca: 17, ex: 32 }],
    [{ ca: 26, ex: 50 }, { ca: 24, ex: 47 }, { ca: 28, ex: 52 }, { ca: 23, ex: 46 }, { ca: 25, ex: 49 }],
    [{ ca: 31, ex: 58 }, { ca: 29, ex: 54 }, { ca: 33, ex: 60 }, { ca: 28, ex: 52 }, { ca: 30, ex: 56 }],
    [{ ca: 20, ex: 38 }, { ca: 22, ex: 41 }, { ca: 19, ex: 36 }, { ca: 21, ex: 40 }, { ca: 18, ex: 34 }],
    [{ ca: 28, ex: 53 }, { ca: 27, ex: 51 }, { ca: 30, ex: 56 }, { ca: 26, ex: 49 }, { ca: 29, ex: 54 }],
    [{ ca: 24, ex: 45 }, { ca: 22, ex: 43 }, { ca: 26, ex: 48 }, { ca: 20, ex: 40 }, { ca: 23, ex: 44 }],
  ];

  let ss2bIdx = 0;
  for (const def of extraDefs) {
    const slug  = def.name.toLowerCase().replace(/\s+/g, '.');
    const email = `${slug}@demo.flexischool.app`;
    const classId = def.cls === 'c1' ? class1.id : class2.id;

    const extraUser = await prisma.user.create({
      data: {
        tenantId:     tenant.id,
        email,
        passwordHash: await import('bcryptjs').then(b => b.hash('Student1234!', 10)),
        roleId:       studentRole.id,
        profile:      { fullName: def.name },
      },
    });

    const extraStudent = await prisma.student.create({
      data: { tenantId: tenant.id, userId: extraUser.id, admissionNo: def.admNo, classId, boardingStatus: def.boarding },
    });

    // Scores for SS2B students only
    if (def.cls === 'c2') {
      const scores = ss2bScores[ss2bIdx++];
      for (let s = 0; s < subjects.length; s++) {
        const sc = scores[s];
        await prisma.score.create({
          data: {
            tenantId:    tenant.id,
            studentId:   extraStudent.id,
            subjectId:   subjects[s].id,
            sessionId:   session.id,
            term:        'FIRST',
            components:  { CA: sc.ca, Exam: sc.ex },
            total:       sc.ca + sc.ex,
            submittedBy: teacherUser.id,
          },
        });
      }
    }

    // Attendance for all extra students
    for (const date of attendanceDates) {
      const statuses: ('PRESENT' | 'ABSENT' | 'LATE')[] = ['PRESENT', 'PRESENT', 'PRESENT', 'PRESENT', 'LATE', 'PRESENT', 'PRESENT', 'ABSENT', 'PRESENT', 'PRESENT'];
      const st = statuses[Math.floor(Math.random() * statuses.length)];
      await prisma.attendance.create({
        data: { tenantId: tenant.id, classId, sessionId: session.id, date, studentId: extraStudent.id, status: st, markedBy: teacherUser.id },
      }).catch(() => {}); // skip if date already exists
    }

    // Invoice for some students (every other one, starting from the 3rd)
    const invIdx = extraDefs.indexOf(def);
    if (invIdx % 3 !== 0) {
      const isPaid   = invIdx % 2 === 0;
      const isOverdue = invIdx % 5 === 4;
      const status   = isPaid ? 'PAID' : (isOverdue ? 'OVERDUE' : 'UNPAID');
      const total    = 640.00;

      const inv = await prisma.invoice.create({
        data: {
          tenantId:    tenant.id,
          studentId:   extraStudent.id,
          sessionId:   session.id,
          term:        'FIRST',
          status:      status as 'PAID' | 'OVERDUE' | 'UNPAID',
          totalAmount: total,
          dueDate:     new Date('2024-10-01'),
          items: {
            create: [
              { tenantId: tenant.id, feeCategoryId: catFees.id,   description: 'First Term Tuition', amount: 500.00 },
              { tenantId: tenant.id, feeCategoryId: catBooks.id,  description: null, amount: 80.00 },
              { tenantId: tenant.id, feeCategoryId: catExam.id,   description: null, amount: 30.00 },
              { tenantId: tenant.id, feeCategoryId: catLab.id,    description: null, amount: 30.00 },
            ],
          },
        },
      });

      if (isPaid) {
        await prisma.payment.create({
          data: {
            tenantId:      tenant.id,
            invoiceId:     inv.id,
            amount:        total,
            currency:      'USD',
            gateway:       invIdx % 4 === 0 ? 'CASH' : 'BANK_TRANSFER',
            status:        'COMPLETED',
            paidAt:        new Date('2024-09-20'),
          },
        });
      }
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
