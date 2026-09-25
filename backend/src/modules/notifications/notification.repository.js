import { and, desc, eq } from 'drizzle-orm';
import { notifications } from '../../database/schema/index.js';
export class DrizzleNotificationRepository {
    database;
    constructor(database) {
        this.database = database;
    }
    async listForRecipient(recipientAuthUserId) {
        return this.database
            .select()
            .from(notifications)
            .where(eq(notifications.recipientAuthUserId, recipientAuthUserId))
            .orderBy(desc(notifications.createdAt));
    }
    async countUnread(recipientAuthUserId) {
        const rows = await this.database
            .select({ id: notifications.id })
            .from(notifications)
            .where(and(eq(notifications.recipientAuthUserId, recipientAuthUserId), eq(notifications.isRead, false)));
        return rows.length;
    }
    async getById(id) {
        const [record] = await this.database.select().from(notifications).where(eq(notifications.id, id)).limit(1);
        return record;
    }
    async markRead(id, recipientAuthUserId) {
        const readAt = new Date();
        const [updated] = await this.database
            .update(notifications)
            .set({ isRead: true, readAt, updatedAt: readAt })
            .where(and(eq(notifications.id, id), eq(notifications.recipientAuthUserId, recipientAuthUserId)))
            .returning();
        return updated;
    }
    async markAllRead(recipientAuthUserId) {
        const readAt = new Date();
        const updated = await this.database
            .update(notifications)
            .set({ isRead: true, readAt, updatedAt: readAt })
            .where(and(eq(notifications.recipientAuthUserId, recipientAuthUserId), eq(notifications.isRead, false)))
            .returning({ id: notifications.id });
        return updated.length;
    }
    async insert(record) {
        const [inserted] = await this.database.insert(notifications).values(record).returning();
        if (inserted === undefined) {
            throw new Error('Notification insert did not return a record.');
        }
        return inserted;
    }
}
