import { request } from './api';
export async function getAuthorizationRequests() {
    return request('get', '/authorization-requests');
}
export async function getPendingAuthorizationRequests() {
    return request('get', '/authorization-requests/pending');
}
export async function getAuthorizationRequestById(id) {
    try {
        return await request('get', `/authorization-requests/${id}`);
    }
    catch (error) {
        if (error instanceof Error && 'status' in error && error.status === 404) {
            return undefined;
        }
        throw error;
    }
}
export async function approveAuthorizationRequest(id) {
    await request(`post`, `/authorization-requests/${id}/approve`);
}
export async function rejectAuthorizationRequest(id) {
    await request(`post`, `/authorization-requests/${id}/reject`);
}
