import { prisma } from '../../prisma/client';
import { AppError } from '../../utils/AppError';

export interface AllocateInput {
  studentId: string;
  bedId: string;
  sessionId: string;
  tenantId: string;
}

export async function allocateBed(input: AllocateInput) {
  const { studentId, bedId, sessionId, tenantId } = input;

  // 1. Verify student exists in this tenant and is a BOARDER
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { boardingStatus: true, tenantId: true },
  });

  if (!student || student.tenantId !== tenantId) {
    throw new AppError('Student not found', 404, 'STUDENT_NOT_FOUND');
  }

  if (student.boardingStatus !== 'BOARDER') {
    throw new AppError(
      'Only students with BOARDER boarding status may be assigned to a hostel bed',
      422,
      'BOARDERS_ONLY',
    );
  }

  // 2. Verify bed is vacant and owned by this tenant
  const bed = await prisma.bed.findUnique({
    where: { id: bedId },
    select: { status: true, tenantId: true },
  });

  if (!bed || bed.tenantId !== tenantId) {
    throw new AppError('Bed not found', 404, 'BED_NOT_FOUND');
  }

  if (bed.status !== 'VACANT') {
    throw new AppError(
      `Bed is not available (current status: ${bed.status})`,
      409,
      'BED_NOT_VACANT',
    );
  }

  // 3. Prevent duplicate allocation for the same session
  const existing = await prisma.hostelAllocation.findFirst({
    where: { studentId, sessionId, tenantId },
  });

  if (existing) {
    throw new AppError(
      'Student already has a bed allocation for this session',
      409,
      'ALREADY_ALLOCATED',
    );
  }

  // 4. Atomically create allocation + mark bed OCCUPIED
  const allocation = await prisma.$transaction(async (tx) => {
    const created = await tx.hostelAllocation.create({
      data: { studentId, bedId, sessionId, tenantId },
    });
    await tx.bed.update({
      where: { id: bedId },
      data: { status: 'OCCUPIED' },
    });
    return created;
  });

  return { allocation };
}

export async function deallocateBed(allocationId: string, tenantId: string) {
  const allocation = await prisma.hostelAllocation.findUnique({
    where: { id: allocationId },
    select: { bedId: true, tenantId: true },
  });

  if (!allocation || allocation.tenantId !== tenantId) {
    throw new AppError('Allocation not found', 404, 'ALLOCATION_NOT_FOUND');
  }

  await prisma.$transaction(async (tx) => {
    await tx.hostelAllocation.delete({ where: { id: allocationId } });
    await tx.bed.update({
      where: { id: allocation.bedId },
      data: { status: 'VACANT' },
    });
  });
}

export async function listDormitories(tenantId: string) {
  return prisma.dormitory.findMany({
    where: { tenantId },
    include: {
      beds: { orderBy: [{ roomNumber: 'asc' }, { bedNumber: 'asc' }] },
    },
    orderBy: { name: 'asc' },
  });
}
