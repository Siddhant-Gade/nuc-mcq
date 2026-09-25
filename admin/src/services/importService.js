import { getStudents, createStudent } from './studentService';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export async function downloadTemplate() {
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
export async function parseCsvFile(file) {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2)
        return [];
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    return lines.slice(1).map((line) => {
        const cols = line.split(',');
        const row = {};
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
export async function validateRows(rows) {
    let existingStudents = [];
    try {
        existingStudents = await getStudents();
    }
    catch {}
    const existingIds = new Set(existingStudents.map((s) => s.studentId));
    const existingEmails = new Set(existingStudents.map((s) => (s.email ?? '').toLowerCase()));
    return rows.map((row) => {
        const errors = [];
        if (!row.studentId)
            errors.push('Missing student ID');
        if (!row.name)
            errors.push('Missing name');
        if (!row.email)
            errors.push('Missing email');
        if (!row.mobile)
            errors.push('Missing mobile');
        if (!row.batchId)
            errors.push('Missing batch ID');
        if (!row.courseInfo)
            errors.push('Missing course info');
        if (row.email && !EMAIL_RE.test(row.email)) {
            errors.push('Invalid email format');
        }
        if (existingIds.has(row.studentId)) {
            errors.push('Duplicate student ID');
        }
        if (row.email && existingEmails.has(row.email.toLowerCase())) {
            errors.push('Duplicate email');
        }
        let status = 'valid';
        if (errors.length === 1 && errors[0].startsWith('Duplicate')) {
            status = 'duplicate';
        }
        else if (errors.length === 1 && errors[0].startsWith('Invalid')) {
            status = 'invalid_email';
        }
        else if (errors.length > 0) {
            status = 'missing_field';
        }
        return { ...row, status, errors };
    });
}
export async function executeImport(rows) {
    const importedIds = [];
    const errors = [];
    for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (r.status !== 'valid') {
            errors.push({ row: i + 2, message: r.errors.join('; ') });
            continue;
        }
        try {
            await createStudent({
                studentId: r.studentId,
                name: r.name,
                email: r.email,
                mobile: r.mobile,
                instituteId: 'INST001',
                batchId: r.batchId,
                photoPath: '',
                courseInfo: r.courseInfo,
            });
            importedIds.push(r.studentId);
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Creation failed';
            errors.push({ row: i + 2, message: msg });
        }
    }
    return {
        totalRows: rows.length,
        validRows: importedIds.length,
        skippedRows: rows.length - importedIds.length,
        importedIds,
        errors,
    };
}
