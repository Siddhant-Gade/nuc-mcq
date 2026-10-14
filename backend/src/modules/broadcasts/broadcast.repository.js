import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import * as schema from '../../database/schema/index.js';
import { broadcastTargets, broadcasts } from '../../database/schema/index.js';
const attachTargets = (records, targetRows) => {
    const byBroadcast = new Map();
    for (const row of targetRows) {
        const ids = byBroadcast.get(row.broadcastId) ?? [];
        ids.push(row.batchId);
        byBroadcast.set(row.broadcastId, ids);
    }
    return records.map((record) => ({ ...record, targetBatchIds: byBroadcast.get(record.id) ?? [] }));
};
export class DrizzleBroadcastRepository {
    database;
    constructor(database) {
        this.database = database;
    }
    async list() {
        const [records, targetRows] = await Promise.all([
            this.database.select().from(broadcasts).orderBy(desc(broadcasts.createdAt)),
            this.database.select().from(broadcastTargets),
        ]);
        return attachTargets(records, targetRows);
    }
    async listPublishedForStudent(batchId, authUserId) {
        const records = await this.database
            .select()
            .from(broadcasts)
            .where(and(eq(broadcasts.status, 'PUBLISHED'), 
        // ALL-audience broadcasts, or PUBLISHED broadcasts targeting the
        // caller's own batch — decided entirely inside PostgreSQL.
        sql `(${broadcasts.audienceType} = 'ALL' OR EXISTS (
            SELECT 1 FROM ${broadcastTargets}
            WHERE ${broadcastTargets.broadcastId} = ${broadcasts.id}
              AND ${broadcastTargets.batchId} = ${batchId}
          ))`))
            .orderBy(desc(broadcasts.createdAt));
        const targetRows = await this.database.select().from(broadcastTargets).where(eq(broadcastTargets.batchId, batchId));
        const attached = attachTargets(records, targetRows);

        if (!authUserId) {
            return attached.map((b) => ({ ...b, isRead: false, readAt: null }));
        }

        const readRows = await this.database
            .select({ broadcastId: schema.broadcastReads.broadcastId, readAt: schema.broadcastReads.readAt })
            .from(schema.broadcastReads)
            .where(eq(schema.broadcastReads.authUserId, authUserId));

        const readMap = new Map();
        for (const row of readRows) {
            readMap.set(row.broadcastId, row.readAt);
        }

        return attached.map((b) => {
            const readAt = readMap.get(b.id);
            return {
                ...b,
                isRead: readAt !== undefined,
                readAt: readAt ? (readAt instanceof Date ? readAt.toISOString() : String(readAt)) : null,
            };
        });
    }
    async markRead(broadcastId, authUserId) {
        const now = new Date();
        const [inserted] = await this.database
            .insert(schema.broadcastReads)
            .values({ broadcastId, authUserId, readAt: now })
            .onConflictDoUpdate({
                target: [schema.broadcastReads.authUserId, schema.broadcastReads.broadcastId],
                set: { readAt: now },
            })
            .returning();
        return {
            broadcastId,
            isRead: true,
            readAt: (inserted?.readAt ? (inserted.readAt instanceof Date ? inserted.readAt.toISOString() : String(inserted.readAt)) : now.toISOString()),
        };
    }
    async markAllRead(batchId, authUserId) {
        const records = await this.listPublishedForStudent(batchId, authUserId);
        const unread = records.filter((r) => !r.isRead);
        if (unread.length === 0) {
            return { updatedCount: 0 };
        }
        const now = new Date();
        const values = unread.map((r) => ({
            broadcastId: r.id,
            authUserId,
            readAt: now,
        }));
        await this.database
            .insert(schema.broadcastReads)
            .values(values)
            .onConflictDoNothing();
        return { updatedCount: unread.length };
    }
    async countUnread(batchId, authUserId) {
        const records = await this.listPublishedForStudent(batchId, authUserId);
        return records.filter((r) => !r.isRead).length;
    }
    async getById(id) {
        const [record] = await this.database.select().from(broadcasts).where(eq(broadcasts.id, id)).limit(1);
        if (record === undefined) {
            return undefined;
        }
        const targetRows = await this.database
            .select()
            .from(broadcastTargets)
            .where(eq(broadcastTargets.broadcastId, id));
        return attachTargets([record], targetRows)[0];
    }
    async findExistingBatchIds(batchIds) {
        if (batchIds.length === 0) {
            return [];
        }
        const unique = [...new Set(batchIds)];
        const rows = await this.database
            .select({ batchId: schema.batches.batchId })
            .from(schema.batches)
            .where(inArray(schema.batches.batchId, unique));
        return rows.map((row) => row.batchId);
    }
    async insert(record, targetBatchIds) {
        return this.database.transaction(async (transaction) => {
            const [inserted] = await transaction.insert(broadcasts).values(record).returning();
            if (inserted === undefined) {
                throw new Error('Broadcast insert did not return a record.');
            }
            if (targetBatchIds.length > 0) {
                await transaction
                    .insert(broadcastTargets)
                    .values(targetBatchIds.map((batchId) => ({ broadcastId: inserted.id, batchId })));
            }
            return { ...inserted, targetBatchIds };
        });
    }
    async update(id, fields, replacementTargetBatchIds) {
        return this.database.transaction(async (transaction) => {
            const [updated] = await transaction
                .update(broadcasts)
                .set({ ...fields, updatedAt: new Date() })
                .where(eq(broadcasts.id, id))
                .returning();
            if (updated === undefined) {
                return undefined;
            }
            if (replacementTargetBatchIds !== null) {
                await transaction.delete(broadcastTargets).where(eq(broadcastTargets.broadcastId, id));
                if (replacementTargetBatchIds.length > 0) {
                    await transaction
                        .insert(broadcastTargets)
                        .values(replacementTargetBatchIds.map((batchId) => ({ broadcastId: id, batchId })));
                }
                return { ...updated, targetBatchIds: replacementTargetBatchIds };
            }
            const targetRows = await transaction.select().from(broadcastTargets).where(eq(broadcastTargets.broadcastId, id));
            return attachTargets([updated], targetRows)[0];
        });
    }
    async markPublished(id) {
        const publishedAt = new Date();
        const [updated] = await this.database
            .update(broadcasts)
            .set({ status: 'PUBLISHED', publishedAt, updatedAt: publishedAt })
            // Status guard makes the transition one-way and race-free.
            .where(and(eq(broadcasts.id, id), eq(broadcasts.status, 'DRAFT')))
            .returning({ id: broadcasts.id });
        return updated === undefined ? undefined : publishedAt;
    }
    async existsById(id) {
        const [row] = await this.database
            .select({ id: broadcasts.id })
            .from(broadcasts)
            .where(eq(broadcasts.id, id))
            .limit(1);
        return row !== undefined;
    }
    async removeById(id) {
        const deleted = await this.database
            .delete(broadcasts)
            .where(eq(broadcasts.id, id))
            .returning({ id: broadcasts.id });
        return deleted.length > 0;
    }
}
