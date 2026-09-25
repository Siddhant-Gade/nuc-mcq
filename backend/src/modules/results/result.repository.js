import { eq } from 'drizzle-orm';
import { testResults } from '../../database/schema/index.js';
export class DrizzleResultRepository {
    database;
    constructor(database) {
        this.database = database;
    }
    async findByClientEventId(clientEventId) {
        const [record] = await this.database
            .select()
            .from(testResults)
            .where(eq(testResults.clientEventId, clientEventId))
            .limit(1);
        return record;
    }
    async insert(record) {
        // A unique violation (23505) on client_event_id is deliberately allowed to
        // bubble: ResultService converts it into an idempotent replay of the
        // already-stored result.
        const [inserted] = await this.database.insert(testResults).values(record).returning();
        if (inserted === undefined) {
            throw new Error('Test result insert did not return a record.');
        }
        return inserted;
    }
}
