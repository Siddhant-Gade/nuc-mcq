import { request } from './api';
export async function getStudents() {
    return request('get', '/students');
}
export async function getStudentById(id) {
    return request('get', `/students/${id}`);
}
export async function getStudentAccess(studentProfileId) {
    return request('get', `/students/${studentProfileId}/access`);
}
export async function createStudent(data) {
    return request('post', '/students', {
        studentId: data.studentId,
        name: data.name,
        instituteId: data.instituteId,
        batchId: data.batchId,
        ...(data.email ? { email: data.email } : {}),
        ...(data.mobile ? { mobile: data.mobile } : {}),
        ...(data.photoPath ? { photoPath: data.photoPath } : {}),
        ...(data.courseInfo ? { courseInfo: data.courseInfo } : {}),
    });
}
export async function updateStudent(id, data) {
    return request('patch', `/students/${id}`, data);
}
export async function updateStudentAccessStatus(studentProfileId, newStatus) {
    return request('patch', `/students/${studentProfileId}/access-status`, { status: newStatus });
}
export async function deleteStudent(id) {
    return request('delete', `/students/${id}`);
}
export async function getStudentPerformance(studentProfileId) {
    return request('get', `/students/${studentProfileId}/performance`);
}
