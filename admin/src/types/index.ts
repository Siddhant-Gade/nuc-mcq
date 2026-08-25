export interface StudentProfile {
  id: string;
  studentId: string;
  name: string;
  email: string;
  mobile: string;
  instituteId: string;
  batchId: string;
  photoPath: string;
  courseInfo: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentAccess {
  id: string;
  studentProfileId: string;
  authUserId: string;
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  accessGrantedAt: string | null;
  accessExpiryAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudentWithAccess extends StudentProfile {
  accessStatus: StudentAccess['status'];
}

export interface Batch {
  batchId: string;
  batchName: string;
  instituteId: string;
  capacity: number;
  enrolledCount: number;
  status: 'ACTIVE' | 'FULL' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface AuthorizationRequest {
  id: string;
  studentProfileId: string;
  studentName: string;
  studentId: string;
  prn: string;
  authUserId: string;
  requestedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedAt: string | null;
  reviewedBy: string | null;
}

export interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  pendingAuthorizations: number;
  totalBatches: number;
  activeBatches: number;
  fullBatches: number;
}

export interface AdmissionFormData {
  studentId: string;
  name: string;
  email: string;
  mobile: string;
  batchId: string;
  courseInfo: string;
  photo: File | null;
}

export interface Admin {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImportRow {
  studentId: string;
  name: string;
  email: string;
  mobile: string;
  batchId: string;
  courseInfo: string;
}

export type ImportRowStatus = 'valid' | 'duplicate' | 'missing_field' | 'invalid_email';

export interface ValidatedImportRow extends ImportRow {
  status: ImportRowStatus;
  errors: string[];
}

export interface ImportResult {
  totalRows: number;
  validRows: number;
  skippedRows: number;
  importedIds: string[];
  errors: { row: number; message: string }[];
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'announcement' | 'study_material' | 'system';
  isRead: boolean;
  createdAt: string;
  relatedRoute?: string;
}

export interface Broadcast {
  id: string;
  title: string;
  message: string;
  status: 'DRAFT' | 'PUBLISHED';
  createdAt: string;
  publishedAt: string | null;
}

export interface StudyMaterial {
  id: string;
  title: string;
  description: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  status: 'DRAFT' | 'PUBLISHED';
  createdAt: string;
  publishedAt: string | null;
}
