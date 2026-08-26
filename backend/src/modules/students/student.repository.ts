import { asc, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import * as schema from '../../database/schema/index.js';
import { studentAccess, studentProfiles } from '../../database/schema/index.js';
import type {
  CreateStudentInput,
  StudentAccessRecord,
  StudentAccessStatus,
  StudentRecord,
  StudentWithAccessRecord,
  UpdateStudentInput,
} from './student.types.js';

type Database = NodePgDatabase<typeof schema>;

export interface StudentRepository {
  list(): Promise<StudentWithAccessRecord[]>;
  findById(id: string): Promise<StudentRecord | undefined>;
  findAccessByStudentId(studentProfileId: string): Promise<StudentAccessRecord | undefined>;
  create(input: CreateStudentInput): Promise<StudentWithAccessRecord>;
  update(id: string, input: UpdateStudentInput): Promise<StudentRecord | undefined>;
  updateAccessStatus(id: string, status: StudentAccessStatus): Promise<StudentAccessRecord | undefined>;
}

export class DrizzleStudentRepository implements StudentRepository {
  public constructor(private readonly database: Database) {}

  public async list(): Promise<StudentWithAccessRecord[]> {
    const rows = await this.database
      .select({ student: studentProfiles, accessStatus: studentAccess.status })
      .from(studentProfiles)
      .leftJoin(studentAccess, eq(studentAccess.studentProfileId, studentProfiles.id))
      .orderBy(asc(studentProfiles.createdAt));

    return rows.map(({ student, accessStatus }) => ({
      ...student,
      accessStatus: accessStatus ?? 'PENDING',
    }));
  }

  public async findById(id: string): Promise<StudentRecord | undefined> {
    const [student] = await this.database.select().from(studentProfiles).where(eq(studentProfiles.id, id)).limit(1);
    return student;
  }

  public async findAccessByStudentId(studentProfileId: string): Promise<StudentAccessRecord | undefined> {
    const [access] = await this.database
      .select()
      .from(studentAccess)
      .where(eq(studentAccess.studentProfileId, studentProfileId))
      .limit(1);
    return access;
  }

  public async create(input: CreateStudentInput): Promise<StudentWithAccessRecord> {
    return this.database.transaction(async (transaction) => {
      const [student] = await transaction.insert(studentProfiles).values(input).returning();
      if (student === undefined) {
        throw new Error('Student insert did not return a record.');
      }

      const [access] = await transaction
        .insert(studentAccess)
        .values({ studentProfileId: student.id, status: 'PENDING' })
        .returning();
      if (access === undefined) {
        throw new Error('Student access insert did not return a record.');
      }

      return { ...student, accessStatus: access.status };
    });
  }

  public async update(id: string, input: UpdateStudentInput): Promise<StudentRecord | undefined> {
    const [student] = await this.database
      .update(studentProfiles)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(studentProfiles.id, id))
      .returning();
    return student;
  }

  public async updateAccessStatus(id: string, status: StudentAccessStatus): Promise<StudentAccessRecord | undefined> {
    const now = new Date();

    if (status === 'ACTIVE') {
      const [access] = await this.database
        .update(studentAccess)
        .set({ status, accessGrantedAt: now, updatedAt: now })
        .where(eq(studentAccess.studentProfileId, id))
        .returning();
      return access;
    }

    if (status === 'REVOKED') {
      const [access] = await this.database
        .update(studentAccess)
        .set({ status, revokedAt: now, updatedAt: now })
        .where(eq(studentAccess.studentProfileId, id))
        .returning();
      return access;
    }

    const [access] = await this.database
      .update(studentAccess)
      .set({ status, updatedAt: now })
      .where(eq(studentAccess.studentProfileId, id))
      .returning();
    return access;
  }
}
