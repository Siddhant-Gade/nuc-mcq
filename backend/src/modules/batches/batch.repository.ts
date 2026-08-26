import { asc, eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import * as schema from '../../database/schema/index.js';
import { batches, studentProfiles } from '../../database/schema/index.js';
import type { CreateBatchInput, StoredBatchRecord } from './batch.types.js';

type Database = NodePgDatabase<typeof schema>;

export interface BatchRepository {
  list(): Promise<(StoredBatchRecord & { enrolledCount: number })[]>;
  findById(batchId: string): Promise<StoredBatchRecord | undefined>;
  countAssignedStudents(batchId: string): Promise<number>;
  create(input: CreateBatchInput): Promise<StoredBatchRecord>;
  remove(batchId: string): Promise<StoredBatchRecord | undefined>;
}

export class DrizzleBatchRepository implements BatchRepository {
  public constructor(private readonly database: Database) {}

  public async list(): Promise<(StoredBatchRecord & { enrolledCount: number })[]> {
    const rows = await this.database
      .select({
        batch: batches,
        enrolledCount: sql<number>`count(${studentProfiles.id})::int`,
      })
      .from(batches)
      .leftJoin(studentProfiles, eq(studentProfiles.batchId, batches.batchId))
      .groupBy(batches.batchId)
      .orderBy(asc(batches.createdAt));

    return rows.map(({ batch, enrolledCount }) => ({
      ...batch,
      enrolledCount: Number(enrolledCount ?? 0),
    }));
  }

  public async findById(batchId: string): Promise<StoredBatchRecord | undefined> {
    const [batch] = await this.database.select().from(batches).where(eq(batches.batchId, batchId)).limit(1);
    return batch;
  }

  public async countAssignedStudents(batchId: string): Promise<number> {
    const [row] = await this.database
      .select({ assigned: sql<number>`count(*)::int` })
      .from(studentProfiles)
      .where(eq(studentProfiles.batchId, batchId));

    return Number(row?.assigned ?? 0);
  }

  public async create(input: CreateBatchInput): Promise<StoredBatchRecord> {
    const [batch] = await this.database.insert(batches).values(input).returning();
    if (batch === undefined) {
      throw new Error('Batch insert did not return a record.');
    }

    return batch;
  }

  public async remove(batchId: string): Promise<StoredBatchRecord | undefined> {
    const [batch] = await this.database.delete(batches).where(eq(batches.batchId, batchId)).returning();
    return batch;
  }
}
