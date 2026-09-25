import { asc, eq } from 'drizzle-orm';
import { teachers, batches } from '../../database/schema/index.js';
export class DrizzleTeacherRepository {
    database;
    constructor(database) { this.database = database; }
    async list() {
        const rows = await this.database
            .select({ teacher: teachers, batchId: batches.batchId, batchName: batches.batchName })
            .from(teachers)
            .leftJoin(batches, eq(batches.teacherId, teachers.id))
            .orderBy(asc(teachers.createdAt));
        return rows.map(({ teacher, batchId, batchName }) => ({
            ...teacher, assignedBatchId: batchId ?? null, assignedBatchName: batchName ?? null,
        }));
    }
    async findById(id) {
        const [row] = await this.database
            .select({ teacher: teachers, batchId: batches.batchId, batchName: batches.batchName })
            .from(teachers)
            .leftJoin(batches, eq(batches.teacherId, teachers.id))
            .where(eq(teachers.id, id))
            .limit(1);
        if (row === undefined) return undefined;
        return { ...row.teacher, assignedBatchId: row.batchId ?? null, assignedBatchName: row.batchName ?? null };
    }
    async create(input) {
        const [teacher] = await this.database.insert(teachers).values(input).returning();
        if (teacher === undefined) throw new Error('Teacher insert did not return a record.');
        return { ...teacher, assignedBatchId: null, assignedBatchName: null };
    }
    async update(id, fields) {
        const [teacher] = await this.database
            .update(teachers)
            .set({ ...fields, updatedAt: new Date() })
            .where(eq(teachers.id, id))
            .returning();
        return teacher;
    }
    async remove(id) {
        const [teacher] = await this.database.delete(teachers).where(eq(teachers.id, id)).returning();
        return teacher;
    }
}
