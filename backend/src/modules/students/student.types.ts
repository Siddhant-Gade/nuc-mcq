export const studentAccessStatuses = ['PENDING', 'ACTIVE', 'EXPIRED', 'REVOKED'] as const;
export type StudentAccessStatus = (typeof studentAccessStatuses)[number];

export type CreateStudentInput = {
  studentId: string;
  name: string;
  instituteId: string;
  batchId: string;
  email?: string;
  mobile?: string;
  photoPath?: string;
  courseInfo?: string;
};

export type UpdateStudentInput = Partial<Omit<CreateStudentInput, 'studentId' | 'instituteId'>> & {
  instituteId?: string;
};

export type StudentRecord = {
  id: string;
  studentId: string;
  name: string;
  email: string | null;
  mobile: string | null;
  instituteId: string;
  batchId: string;
  photoPath: string | null;
  courseInfo: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type StudentAccessRecord = {
  id: string;
  studentProfileId: string;
  authUserId: string | null;
  status: StudentAccessStatus;
  accessGrantedAt: Date | null;
  accessExpiryAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type StudentWithAccessRecord = StudentRecord & { accessStatus: StudentAccessStatus };
