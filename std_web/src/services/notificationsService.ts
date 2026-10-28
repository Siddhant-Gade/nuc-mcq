import { AppNotification } from '../types';
import { apiClient } from './apiClient';

export const notificationsService = {
  async fetchAll(): Promise<AppNotification[]> {
    const response = await apiClient.get('/api/v1/notifications');
    const data = response.data?.data;
    if (!Array.isArray(data)) return [];
    return data.map((item: Record<string, unknown>) => ({
      id: String(item.id ?? ''),
      title: String(item.title ?? ''),
      message: String(item.message ?? ''),
      type: (String(item.type ?? 'system') as AppNotification['type']),
      relatedRoute: item.relatedRoute == null ? null : String(item.relatedRoute),
      isRead: Boolean(item.isRead),
      readAt: item.readAt == null ? null : String(item.readAt),
      createdAt: String(item.createdAt ?? new Date().toISOString()),
    }));
  },

  async fetchUnreadCount(): Promise<number> {
    const response = await apiClient.get('/api/v1/notifications/unread-count');
    const count = response.data?.data?.count;
    return typeof count === 'number' ? count : 0;
  },

  async markRead(id: string): Promise<void> {
    await apiClient.patch(`/api/v1/notifications/${id}/read`);
  },

  async markAllRead(): Promise<void> {
    await apiClient.post('/api/v1/notifications/read-all');
  },
};
