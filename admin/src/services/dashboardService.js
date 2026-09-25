import { request } from './api';
export async function getDashboardStats() {
    return request('get', '/dashboard/stats');
}
export async function getStudentAnalytics() {
    return request('get', '/dashboard/analytics');
}
