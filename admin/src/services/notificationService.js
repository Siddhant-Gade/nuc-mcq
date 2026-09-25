import { request } from './api';
export async function getNotifications() {
    return request('get', '/notifications');
}
export async function getUnreadCount() {
    const data = await request('get', '/notifications/unread-count');
    return data.count;
}
export async function markAsRead(id) {
    await request('patch', `/notifications/${id}/read`);
}
export async function markAllAsRead() {
    await request('post', '/notifications/read-all');
}
