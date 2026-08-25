import type { ImportRow, ValidatedImportRow, ImportResult } from '../types';
import { mockStudents } from './mockData';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function downloadTemplate(): Promise<void> {
  const headers = ['studentId', 'name', 'email', 'mobile', 'batchId', 'courseInfo'];
  const csv = headers.join(',') + '\n' + 'PRN009,John Doe,john@example.com,9000000009,B001,MSCIT\n';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'student_import_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export async function parseCsvFile(file: File): Promise<ImportRow[]> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cols = line.split(',');
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (cols[i] ?? '').trim(); });
    return {
      studentId: row.studentid ?? row.student_id ?? '',
      name: row.name ?? '',
      email: row.email ?? '',
      mobile: row.mobile ?? row.phone ?? '',
      batchId: row.batchid ?? row.batch_id ?? '',
      courseInfo: row.courseinfo ?? row.course ?? '',
    };
  });
}

export async function validateRows(rows: ImportRow[]): Promise<ValidatedImportRow[]> {
  await delay(300);
  const existingIds = new Set(mockStudents.map((s) => s.studentId));
  const existingEmails = new Set(mockStudents.map((s) => s.email.toLowerCase()));

  return rows.map((row) => {
    const errors: string[] = [];
    if (!row.studentId) errors.push('Missing student ID');
    if (!row.name) errors.push('Missing name');
    if (!row.email) errors.push('Missing email');
    if (!row.mobile) errors.push('Missing mobile');
    if (!row.batchId) errors.push('Missing batch ID');
    if (!row.courseInfo) errors.push('Missing course info');

    if (row.email && !EMAIL_RE.test(row.email)) {
      errors.push('Invalid email format');
    }
    if (existingIds.has(row.studentId)) {
      errors.push('Duplicate student ID');
    }
    if (row.email && existingEmails.has(row.email.toLowerCase())) {
      errors.push('Duplicate email');
    }

    let status: ValidatedImportRow['status'] = 'valid';
    if (errors.length === 1 && errors[0].startsWith('Duplicate')) {
      status = 'duplicate';
    } else if (errors.length === 1 && errors[0].startsWith('Invalid')) {
      status = 'invalid_email';
    } else if (errors.length > 0) {
      status = 'missing_field';
    }

    return { ...row, status, errors };
  });
}

export async function executeImport(rows: ValidatedImportRow[]): Promise<ImportResult> {
  await delay(600);
  const valid = rows.filter((r) => r.status === 'valid');
  const now = new Date().toISOString();
  valid.forEach((r, i) => {
    mockStudents.push({
      id: 'IMP' + Date.now() + '-' + i,
      studentId: r.studentId,
      name: r.name,
      email: r.email,
      mobile: r.mobile,
      instituteId: 'INST001',
      batchId: r.batchId,
      photoPath: '',
      courseInfo: r.courseInfo,
      createdAt: now,
      updatedAt: now,
    });
  });
  return {
    totalRows: rows.length,
    validRows: valid.length,
    skippedRows: rows.length - valid.length,
    importedIds: valid.map((r) => r.studentId),
    errors: rows
      .map((r, i) => (r.status !== 'valid' ? { row: i + 2, message: r.errors.join('; ') } : null))
      .filter((e): e is { row: number; message: string } => e !== null),
  };
}
