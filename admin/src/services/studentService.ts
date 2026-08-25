import type { StudentProfile, StudentAccess, StudentWithAccess } from '../types';
import { mockStudents, mockAccess } from './mockData';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getStudents(): Promise<StudentWithAccess[]> {
  await delay(300);
  return mockStudents.map((s) => {
    const access = mockAccess.find((a) => a.studentProfileId === s.id);
    return { ...s, accessStatus: access?.status ?? 'PENDING' };
  });
}

export async function getStudentById(id: string): Promise<StudentProfile | undefined> {
  await delay(200);
  return mockStudents.find((s) => s.id === id);
}

export async function getStudentAccess(studentProfileId: string) {
  await delay(200);
  return mockAccess.find((a) => a.studentProfileId === studentProfileId);
}

export async function createStudent(data: Omit<StudentProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<StudentProfile> {
  await delay(500);
  const now = new Date().toISOString();
  const student: StudentProfile = {
    ...data,
    id: 'S' + String(mockStudents.length + 1).padStart(3, '0'),
    createdAt: now,
    updatedAt: now,
  };
  mockStudents.push(student);
  mockAccess.push({
    id: 'A' + String(mockAccess.length + 1).padStart(3, '0'),
    studentProfileId: student.id,
    authUserId: '',
    status: 'PENDING',
    accessGrantedAt: null,
    accessExpiryAt: null,
    revokedAt: null,
    createdAt: now,
    updatedAt: now,
  });
  return student;
}

export async function updateStudentAccessStatus(
  studentProfileId: string,
  newStatus: StudentAccess['status'],
): Promise<StudentAccess> {
  await delay(400);
  const record = mockAccess.find((a) => a.studentProfileId === studentProfileId);
  if (!record) throw new Error('Student access record not found');
  record.status = newStatus;
  record.updatedAt = new Date().toISOString();
  return { ...record };
}
