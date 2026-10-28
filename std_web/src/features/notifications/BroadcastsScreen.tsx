import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { AppNotification, Broadcast } from '../../types';
import { broadcastsService } from '../../services/broadcastsService';
import { notificationsService } from '../../services/notificationsService';

export const BroadcastsScreen: React.FC = () => {
  const { t } = useLanguage();

  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  // Task 2: expose errors instead of silently showing empty list
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, appNotifications] = await Promise.all([
        broadcastsService.fetchPublished(),
        notificationsService.fetchAll(),
      ]);
      setBroadcasts(list);
      setNotifications(appNotifications);
    } catch (err) {
      console.error('[BroadcastsScreen] Failed to load notices:', err);
      setError('Unable to load notices. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    broadcastsService.syncPendingReads().catch(() => {});
    const refresh = () => loadData();
    window.addEventListener('nuc_notifications_updated', refresh);
    return () => {
      window.removeEventListener('nuc_notifications_updated', refresh);
    };
  }, []);

  const handleMarkRead = async (b: Broadcast) => {
    if (b.isRead) return;
    await broadcastsService.markRead(b.id);
    setBroadcasts((prev) =>
      prev.map((item) => (item.id === b.id ? { ...item, isRead: true } : item))
    );
  };

  const unreadCount = broadcasts.filter((b) => !b.isRead).length +
  notifications.filter((notification) => !notification.isRead).length;

  const handleNotificationRead = async (notification: AppNotification) => {
  if (notification.isRead) return;
  try {
    await notificationsService.markRead(notification.id);
    setNotifications((previous) => previous.map((item) =>
      item.id === notification.id ? { ...item, isRead: true, readAt: new Date().toISOString() } : item,
    ));
  } catch (error) {
    console.error('[BroadcastsScreen] Failed to mark notification as read:', error);
  }
  };

  const handleMarkAllRead = async () => {
  try {
    await Promise.all([
      broadcastsService.markAllRead(),
      notificationsService.markAllRead(),
    ]);
    setBroadcasts((prev) => prev.map((item) => ({ ...item, isRead: true })));
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true, readAt: new Date().toISOString() })));
  } catch (error) {
    console.error('[BroadcastsScreen] Failed to mark all notifications as read:', error);
  }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            {t('tab_notices')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Important announcements, schedule changes, and notices from New Unique Computers.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer w-fit"
          >
            <CheckCheck className="w-4 h-4 text-indigo-600" />
            <span>Mark All as Read ({unreadCount})</span>
          </button>
        )}
      </div>

      {/* Broadcasts List */}
      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        /* Task 2: Show actual error state with retry button */
        <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <div className="space-y-1">
            <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
              Could not load notices
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {error}
            </p>
          </div>
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      ) : broadcasts.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <Bell className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
          <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
            No active announcements
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You're all caught up! New batch notices and exam alerts will be posted here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={`notification-${notification.id}`}
              onClick={() => handleNotificationRead(notification)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-sm space-y-3 ${
                !notification.isRead
                  ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {!notification.isRead && <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />}
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">
                    {notification.type.replace('_', ' ')}
                  </span>
                </div>
                <span className="text-xs text-slate-400">{new Date(notification.createdAt).toLocaleDateString()}</span>
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">{notification.title}</h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">{notification.message}</p>
            </div>
          ))}
          {broadcasts.map((b) => {
            const isUrgent = b.priority === 'URGENT' || b.priority === 'HIGH';

            return (
              <div
                key={b.id}
                onClick={() => handleMarkRead(b)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-sm space-y-3 ${
                  !b.isRead
                    ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {!b.isRead && (
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
                    )}
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        isUrgent
                          ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {b.priority || 'Notice'}
                    </span>
                    {b.category && (
                      <span className="text-xs text-slate-400 font-medium">• {b.category}</span>
                    )}
                  </div>

                  <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(b.publishedAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {b.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    {b.message}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
