import { request } from './api';
export async function getTeachers() {
    return request('get', '/teachers');
}
export async function createTeacher(data) {
    return request('post', '/teachers', {
        name: data.name,
        email: data.email,
        mobile: data.mobile || undefined,
        subject: data.subject || undefined,
        instituteId: data.instituteId || 'INST001',
    });
}
export async function updateTeacher(id, data) {
    return request('patch', `/teachers/${id}`, data);
}
export async function deleteTeacher(id) {
    await request('delete', `/teachers/${id}`);
}
export async function assignTeacherToBatch(batchId, teacherId) {
    return request('patch', `/batches/${batchId}/teacher`, { teacherId });
}
export async function unassignTeacherFromBatch(batchId) {
    return request('patch', `/batches/${batchId}/teacher`, { teacherId: null });
}
