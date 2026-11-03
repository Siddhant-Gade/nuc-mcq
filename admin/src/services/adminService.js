import { request } from './api';

export async function getPinStatus() {
    return request('get', '/admin/security/pin-status');
}

export async function setupPin(data) {
    return request('post', '/admin/security/setup-pin', data);
}

export async function verifyPin(pin) {
    return request('post', '/admin/security/verify-pin', { pin });
}

export async function getAdmins() {
    return request('get', '/admin/admins');
}

export async function createAdmin(data) {
    return request('post', '/admin/admins', data);
}

export async function deleteAdmin(id, pin) {
    return request('delete', `/admin/admins/${id}`, { pin });
}
