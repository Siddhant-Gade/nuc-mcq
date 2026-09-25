import { and, desc, eq, isNull, or } from 'drizzle-orm';
import * as schema from '../../database/schema/index.js';
import { studyMaterials } from '../../database/schema/index.js';
export class DrizzleStudyMaterialRepository {
    database;
    constructor(database) {
        this.database = database;
    }
    async list() {
        return this.database.select().from(studyMaterials).orderBy(desc(studyMaterials.createdAt));
    }
    async listPublishedForStudent(batchId) {
        return this.database
            .select()
            .from(studyMaterials)
            .where(and(eq(studyMaterials.status, 'PUBLISHED'), 
        // Visibility lives in SQL so modified API requests gain nothing.
        or(isNull(studyMaterials.batchId), eq(studyMaterials.batchId, batchId))))
            .orderBy(desc(studyMaterials.createdAt));
    }
    async getById(id) {
        const [record] = await this.database.select().from(studyMaterials).where(eq(studyMaterials.id, id)).limit(1);
        return record;
    }
    async batchExists(batchId) {
        const [row] = await this.database
            .select({ batchId: schema.batches.batchId })
            .from(schema.batches)
            .where(eq(schema.batches.batchId, batchId))
            .limit(1);
        return row !== undefined;
    }
    async insert(record) {
        const [inserted] = await this.database.insert(studyMaterials).values(record).returning();
        if (inserted === undefined) {
            throw new Error('Study material insert did not return a record.');
        }
        return inserted;
    }
    async update(id, fields) {
        const patch = { updatedAt: new Date() };
        if (fields.title !== undefined)
            patch.title = fields.title;
        if (fields.description !== undefined)
            patch.description = fields.description;
        if (fields.status !== undefined) {
            patch.status = fields.status;
            patch.publishedAt = fields.status === 'PUBLISHED' ? new Date() : null;
        }
        if (fields.batchId !== undefined)
            patch.batchId = fields.batchId;
        const [updated] = await this.database.update(studyMaterials).set(patch).where(eq(studyMaterials.id, id)).returning();
        return updated;
    }
    async markPublished(id) {
        const publishedAt = new Date();
        const [updated] = await this.database
            .update(studyMaterials)
            .set({ status: 'PUBLISHED', publishedAt, updatedAt: publishedAt })
            .where(and(eq(studyMaterials.id, id), eq(studyMaterials.status, 'DRAFT')))
            .returning({ id: studyMaterials.id });
        return updated === undefined ? undefined : publishedAt;
    }
    async removeById(id) {
        const removed = await this.database
            .delete(studyMaterials)
            .where(eq(studyMaterials.id, id))
            .returning({ id: studyMaterials.id });
        return removed.length > 0;
    }
    async getTargetStudentAuthUserIds(batchId) {
        const query = this.database
            .select({ authUserId: schema.studentAccess.authUserId })
            .from(schema.studentProfiles)
            .innerJoin(schema.studentAccess, eq(schema.studentAccess.studentProfileId, schema.studentProfiles.id))
            .where(and(
                eq(schema.studentAccess.status, 'ACTIVE'),
                batchId ? eq(schema.studentProfiles.batchId, batchId) : undefined
            ));
        const rows = await query;
        return rows.map((r) => r.authUserId).filter((id) => id !== null && id !== undefined);
    }
}
