import { Broadcast } from '../types';
import { apiClient } from './apiClient';

const PENDING_READ_IDS_KEY = 'pending_read_broadcast_ids_v1';
const PENDING_READ_ALL_KEY = 'pending_read_all_broadcasts_v1';

export const broadcastsService = {
  async fetchPublished(): Promise<Broadcast[]> {
    const response = await apiClient.get('/api/v1/student/broadcasts');
    const data = response.data?.data;
    if (Array.isArray(data)) {
      return data.map((b: { id?: string; title?: string; message?: string; category?: string; priority?: string; publishedAt?: string; created_at?: string; readAt?: string; isRead?: boolean }) => ({
        id: String(b.id || ''),
        title: String(b.title || ''),
        message: String(b.message || ''),
        category: b.category,
        priority: (b.priority as Broadcast['priority']) || 'NORMAL',
        publishedAt: b.publishedAt || b.created_at || new Date().toISOString(),
        readAt: b.readAt,
        isRead: Boolean(b.readAt || b.isRead),
      }));
    }
    return [];
  },

  async fetchUnreadCount(): Promise<number> {
    try {
      const response = await apiClient.get('/api/v1/student/broadcasts/unread-count', {
        headers: {
          'X-Passive-Request': 'true',
        },
      });
      const count = response.data?.data?.unreadCount;
      return typeof count === 'number' ? count : 0;
    } catch {
      return 0;
    }
  },

  async markRead(id: string): Promise<void> {
    try {
      await apiClient.patch(`/api/v1/student/broadcasts/${id}/read`);
    } catch {
      // Offline fallback: save to pending queue
      try {
        const raw = localStorage.getItem(PENDING_READ_IDS_KEY);
        const set = new Set(raw ? JSON.parse(raw) : []);
        set.add(id);
        localStorage.setItem(PENDING_READ_IDS_KEY, JSON.stringify(Array.from(set)));
      } catch {
        // Ignore
      }
    }
  },

  async markAllRead(): Promise<void> {
    try {
      await apiClient.post('/api/v1/student/broadcasts/read-all');
    } catch {
      try {
        localStorage.setItem(PENDING_READ_ALL_KEY, 'true');
      } catch {
        // Ignore
      }
    }
  },

  async syncPendingReads(): Promise<void> {
    try {
      const pendingReadAll = localStorage.getItem(PENDING_READ_ALL_KEY) === 'true';
      if (pendingReadAll) {
        try {
          await apiClient.post('/api/v1/student/broadcasts/read-all');
          localStorage.removeItem(PENDING_READ_ALL_KEY);
          localStorage.removeItem(PENDING_READ_IDS_KEY);
          return;
        } catch {
          return;
        }
      }

      const raw = localStorage.getItem(PENDING_READ_IDS_KEY);
      const pendingIds: string[] = raw ? JSON.parse(raw) : [];
      if (pendingIds.length === 0) return;

      const remaining: string[] = [];
      for (const id of pendingIds) {
        try {
          await apiClient.patch(`/api/v1/student/broadcasts/${id}/read`);
        } catch {
          remaining.push(id);
        }
      }

      if (remaining.length === 0) {
        localStorage.removeItem(PENDING_READ_IDS_KEY);
      } else {
        localStorage.setItem(PENDING_READ_IDS_KEY, JSON.stringify(remaining));
      }
    } catch {
      // Ignore
    }
  },
};
