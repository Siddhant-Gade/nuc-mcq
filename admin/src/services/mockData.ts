import type { StudentProfile, StudentAccess, Batch, AuthorizationRequest } from '../types';

export const mockBatches: Batch[] = [
  { batchId: 'B001', batchName: 'Batch A — 2026', instituteId: 'INST001', capacity: 30, enrolledCount: 24, status: 'ACTIVE', createdAt: '2026-01-10T09:00:00Z', updatedAt: '2026-08-01T12:00:00Z' },
  { batchId: 'B002', batchName: 'Batch B — 2026', instituteId: 'INST001', capacity: 30, enrolledCount: 30, status: 'FULL', createdAt: '2026-02-05T09:00:00Z', updatedAt: '2026-07-15T12:00:00Z' },
  { batchId: 'B003', batchName: 'Batch C — 2026', instituteId: 'INST001', capacity: 25, enrolledCount: 12, status: 'ACTIVE', createdAt: '2026-03-01T09:00:00Z', updatedAt: '2026-08-10T12:00:00Z' },
  { batchId: 'B004', batchName: 'Batch A — 2025', instituteId: 'INST001', capacity: 20, enrolledCount: 20, status: 'INACTIVE', createdAt: '2025-01-10T09:00:00Z', updatedAt: '2025-12-31T12:00:00Z' },
];

const mockStudents: StudentProfile[] = [
  { id: 'S001', studentId: 'PRN001', name: 'Aarav Patil', email: 'aarav@example.com', mobile: '9000000001', instituteId: 'INST001', batchId: 'B001', photoPath: '', courseInfo: 'MSCIT', createdAt: '2026-01-15T10:00:00Z', updatedAt: '2026-01-15T10:00:00Z' },
  { id: 'S002', studentId: 'PRN002', name: 'Sneha Kulkarni', email: 'sneha@example.com', mobile: '9000000002', instituteId: 'INST001', batchId: 'B001', photoPath: '', courseInfo: 'MSCIT', createdAt: '2026-01-16T10:00:00Z', updatedAt: '2026-01-16T10:00:00Z' },
  { id: 'S003', studentId: 'PRN003', name: 'Rohan Deshmukh', email: 'rohan@example.com', mobile: '9000000003', instituteId: 'INST001', batchId: 'B001', photoPath: '', courseInfo: 'MSCIT', createdAt: '2026-01-17T10:00:00Z', updatedAt: '2026-01-17T10:00:00Z' },
  { id: 'S004', studentId: 'PRN004', name: 'Priya Jadhav', email: 'priya@example.com', mobile: '9000000004', instituteId: 'INST001', batchId: 'B002', photoPath: '', courseInfo: 'MSCIT', createdAt: '2026-02-10T10:00:00Z', updatedAt: '2026-02-10T10:00:00Z' },
  { id: 'S005', studentId: 'PRN005', name: 'Aditya Rao', email: 'aditya@example.com', mobile: '9000000005', instituteId: 'INST001', batchId: 'B002', photoPath: '', courseInfo: 'MSCIT', createdAt: '2026-02-11T10:00:00Z', updatedAt: '2026-02-11T10:00:00Z' },
  { id: 'S006', studentId: 'PRN006', name: 'Meera Sharma', email: 'meera@example.com', mobile: '9000000006', instituteId: 'INST001', batchId: 'B003', photoPath: '', courseInfo: 'MSCIT', createdAt: '2026-03-05T10:00:00Z', updatedAt: '2026-03-05T10:00:00Z' },
  { id: 'S007', studentId: 'PRN007', name: 'Karan Nair', email: 'karan@example.com', mobile: '9000000007', instituteId: 'INST001', batchId: 'B003', photoPath: '', courseInfo: 'MSCIT', createdAt: '2026-03-06T10:00:00Z', updatedAt: '2026-03-06T10:00:00Z' },
  { id: 'S008', studentId: 'PRN008', name: 'Ananya Bhat', email: 'ananya@example.com', mobile: '9000000008', instituteId: 'INST001', batchId: 'B001', photoPath: '', courseInfo: 'MSCIT', createdAt: '2026-04-01T10:00:00Z', updatedAt: '2026-04-01T10:00:00Z' },
];

const mockAccess: StudentAccess[] = [
  { id: 'A001', studentProfileId: 'S001', authUserId: 'auth-001', status: 'ACTIVE', accessGrantedAt: '2026-01-20T10:00:00Z', accessExpiryAt: '2026-07-20T10:00:00Z', revokedAt: null, createdAt: '2026-01-15T10:00:00Z', updatedAt: '2026-01-20T10:00:00Z' },
  { id: 'A002', studentProfileId: 'S002', authUserId: 'auth-002', status: 'ACTIVE', accessGrantedAt: '2026-01-21T10:00:00Z', accessExpiryAt: '2026-07-21T10:00:00Z', revokedAt: null, createdAt: '2026-01-16T10:00:00Z', updatedAt: '2026-01-21T10:00:00Z' },
  { id: 'A003', studentProfileId: 'S003', authUserId: '', status: 'PENDING', accessGrantedAt: null, accessExpiryAt: null, revokedAt: null, createdAt: '2026-01-17T10:00:00Z', updatedAt: '2026-01-17T10:00:00Z' },
  { id: 'A004', studentProfileId: 'S004', authUserId: 'auth-004', status: 'ACTIVE', accessGrantedAt: '2026-02-15T10:00:00Z', accessExpiryAt: '2026-08-15T10:00:00Z', revokedAt: null, createdAt: '2026-02-10T10:00:00Z', updatedAt: '2026-02-15T10:00:00Z' },
  { id: 'A005', studentProfileId: 'S005', authUserId: 'auth-005', status: 'EXPIRED', accessGrantedAt: '2026-02-16T10:00:00Z', accessExpiryAt: '2026-06-16T10:00:00Z', revokedAt: null, createdAt: '2026-02-11T10:00:00Z', updatedAt: '2026-06-16T10:00:00Z' },
  { id: 'A006', studentProfileId: 'S006', authUserId: 'auth-006', status: 'ACTIVE', accessGrantedAt: '2026-03-10T10:00:00Z', accessExpiryAt: '2026-09-10T10:00:00Z', revokedAt: null, createdAt: '2026-03-05T10:00:00Z', updatedAt: '2026-03-10T10:00:00Z' },
  { id: 'A007', studentProfileId: 'S007', authUserId: '', status: 'PENDING', accessGrantedAt: null, accessExpiryAt: null, revokedAt: null, createdAt: '2026-03-06T10:00:00Z', updatedAt: '2026-03-06T10:00:00Z' },
  { id: 'A008', studentProfileId: 'S008', authUserId: '', status: 'REVOKED', accessGrantedAt: '2026-04-05T10:00:00Z', accessExpiryAt: null, revokedAt: '2026-05-10T10:00:00Z', createdAt: '2026-04-01T10:00:00Z', updatedAt: '2026-05-10T10:00:00Z' },
];

const mockAuthRequests: AuthorizationRequest[] = [
  { id: 'AR001', studentProfileId: 'S003', studentName: 'Rohan Deshmukh', studentId: 'PRN003', prn: 'PRN003', authUserId: '', requestedAt: '2026-01-17T10:05:00Z', status: 'PENDING', reviewedAt: null, reviewedBy: null },
  { id: 'AR002', studentProfileId: 'S007', studentName: 'Karan Nair', studentId: 'PRN007', prn: 'PRN007', authUserId: '', requestedAt: '2026-03-06T10:10:00Z', status: 'PENDING', reviewedAt: null, reviewedBy: null },
  { id: 'AR003', studentProfileId: 'S001', studentName: 'Aarav Patil', studentId: 'PRN001', prn: 'PRN001', authUserId: 'auth-001', requestedAt: '2026-01-15T10:10:00Z', status: 'APPROVED', reviewedAt: '2026-01-20T10:00:00Z', reviewedBy: 'admin-001' },
  { id: 'AR004', studentProfileId: 'S008', studentName: 'Ananya Bhat', studentId: 'PRN008', prn: 'PRN008', authUserId: '', requestedAt: '2026-04-01T10:15:00Z', status: 'REJECTED', reviewedAt: '2026-05-10T10:00:00Z', reviewedBy: 'admin-001' },
];

export { mockStudents, mockAccess, mockAuthRequests };
