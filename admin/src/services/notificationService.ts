import type { Notification } from '../types';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const mockNotifications: Notification[] = [
  {
    id: 'n1',
    title: 'Announcement published',
    message: 'New announcement: "Mid-term exam schedule released" has been published.',
    type: 'announcement',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    relatedRoute: '/',
  },
  {
    id: 'n2',
    title: 'Study material uploaded',
    message: 'New study material for Batch A: "Unit 3 — Database Systems" has been added.',
    type: 'study_material',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    relatedRoute: '/',
  },
  {
    id: 'n3',
    title: 'System update',
    message: 'The admin panel has been updated to version 2.1.0. Review new features.',
    type: 'system',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
  },
  {
    id: 'n4',
    title: 'New authorization request',
    message: 'Student Aarav Patil has submitted a device re-authorization request.',
    type: 'system',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    relatedRoute: '/authorization-requests',
  },
  {
    id: 'n5',
    title: 'Announcement published',
    message: 'New announcement: "Holiday notice — 15th August" has been published.',
    type: 'announcement',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    relatedRoute: '/',
  },
  {
    id: 'n6',
    title: 'Study material uploaded',
    message: 'New study material for Batch B: "Assignment 2 — Networking" has been added.',
    type: 'study_material',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    relatedRoute: '/',
  },
];

export async function getNotifications(): Promise<Notification[]> {
  await delay(200);
  return mockNotifications.map((n) => ({ ...n }));
}

export async function getUnreadCount(): Promise<number> {
  await delay(100);
  return mockNotifications.filter((n) => !n.isRead).length;
}

export async function markAsRead(id: string): Promise<void> {
  await delay(100);
  const n = mockNotifications.find((n) => n.id === id);
  if (n) n.isRead = true;
}

export async function markAllAsRead(): Promise<void> {
  await delay(100);
  mockNotifications.forEach((n) => { n.isRead = true; });
}
