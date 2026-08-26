import assert from 'node:assert/strict';
import test from 'node:test';

import { ApiError } from '../../utils/api-error.js';
import type {
  CreateStudentInput,
  StudentAccessRecord,
  StudentAccessStatus,
  StudentRecord,
  StudentWithAccessRecord,
  UpdateStudentInput,
} from './student.types.js';
import type { StudentRepository } from './student.repository.js';
import { StudentService } from './student.service.js';

const uniqueViolation = (): Error => Object.assign(new Error('duplicate key value'), { code: '23505' });

class FakeStudentRepository implements StudentRepository {
  public students: StudentRecord[] = [];
  public accessRecords: StudentAccessRecord[] = [];
  private sequence = 0;

  private nextId(): string {
    this.sequence += 1;
    return `00000000-0000-4000-8000-${String(this.sequence).padStart(12, '0')}`;
  }

  private toRecord(
    profile: Pick<StudentRecord, 'studentId' | 'name' | 'instituteId' | 'batchId'> &
      Partial<Pick<StudentRecord, 'email' | 'mobile' | 'photoPath' | 'courseInfo'>>,
  ): StudentRecord {
    const now = new Date();
    return {
      email: null,
      mobile: null,
      photoPath: null,
      courseInfo: null,
      ...profile,
      id: this.nextId(),
      createdAt: now,
      updatedAt: now,
    };
  }

  private toAccess(studentProfileId: string): StudentAccessRecord {
    const now = new Date();
    return {
      id: this.nextId(),
      studentProfileId,
      authUserId: null,
      status: 'PENDING',
      accessGrantedAt: null,
      accessExpiryAt: null,
      revokedAt: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  public seed(input: CreateStudentInput): StudentRecord {
    const student = this.toRecord(input);
    this.students.push(student);
    this.accessRecords.push(this.toAccess(student.id));
    return student;
  }

  public async list(): Promise<StudentWithAccessRecord[]> {
    return this.students.map((student) => ({
      ...student,
      accessStatus:
        this.accessRecords.find((access) => access.studentProfileId === student.id)?.status ?? 'PENDING',
    }));
  }

  public async findById(id: string): Promise<StudentRecord | undefined> {
    return this.students.find((student) => student.id === id);
  }

  public async findByAuthUserId(
    authUserId: string,
  ): Promise<{ profile: StudentRecord; access: StudentAccessRecord } | undefined> {
    const access = this.accessRecords.find((record) => record.authUserId === authUserId);
    if (access === undefined) {
      return undefined;
    }

    const profile = this.students.find((student) => student.id === access.studentProfileId);
    return profile === undefined ? undefined : { profile, access };
  }

  public async findAccessByStudentId(studentProfileId: string): Promise<StudentAccessRecord | undefined> {
    return this.accessRecords.find((access) => access.studentProfileId === studentProfileId);
  }

  public async create(input: CreateStudentInput): Promise<StudentWithAccessRecord> {
    if (this.students.some((student) => student.studentId === input.studentId)) {
      throw uniqueViolation();
    }

    const student = this.toRecord(input);
    this.students.push(student);
    const access = this.toAccess(student.id);
    this.accessRecords.push(access);
    return { ...student, accessStatus: access.status };
  }

  public async update(id: string, input: UpdateStudentInput): Promise<StudentRecord | undefined> {
    const student = this.students.find((candidate) => candidate.id === id);
    if (student === undefined) {
      return undefined;
    }

    const updated: StudentRecord = { ...student, ...input, updatedAt: new Date() };
    this.students[this.students.indexOf(student)] = updated;
    return updated;
  }

  // Mirrors DrizzleStudentRepository.updateAccessStatus timestamp behavior.
  public async updateAccessStatus(id: string, status: StudentAccessStatus): Promise<StudentAccessRecord | undefined> {
    const access = this.accessRecords.find((record) => record.studentProfileId === id);
    if (access === undefined) {
      return undefined;
    }

    const now = new Date();
    access.status = status;
    access.updatedAt = now;

    if (status === 'ACTIVE') {
      access.accessGrantedAt = now;
    } else if (status === 'REVOKED') {
      access.revokedAt = now;
    }

    return access;
  }
}

const createStudentInput = (overrides: Partial<CreateStudentInput> = {}): CreateStudentInput => ({
  studentId: 'STU001',
  name: 'Test Student',
  instituteId: 'INST001',
  batchId: 'BATCH01',
  ...overrides,
});

test('create returns the student with a PENDING access status', async () => {
  const repository = new FakeStudentRepository();
  const service = new StudentService(repository);

  const created = await service.create(createStudentInput());

  assert.equal(created.accessStatus, 'PENDING');
  assert.equal(created.studentId, 'STU001');
  assert.equal(repository.accessRecords.length, 1);
  assert.equal(repository.accessRecords[0]?.studentProfileId, created.id);
});

test('create rejects a duplicate student ID with a conflict error', async () => {
  const service = new StudentService(new FakeStudentRepository());

  await service.create(createStudentInput());

  await assert.rejects(
    () => service.create(createStudentInput({ name: 'Duplicate' })),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.statusCode, 409);
      assert.equal(error.code, 'CONFLICT');
      return true;
    },
  );
});

test('getById throws not found for an unknown student', async () => {
  const service = new StudentService(new FakeStudentRepository());

  await assert.rejects(
    () => service.getById('00000000-0000-4000-8000-000000000099'),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.statusCode, 404);
      return true;
    },
  );
});

test('getAccessByStudentId throws not found when the student does not exist', async () => {
  const service = new StudentService(new FakeStudentRepository());

  await assert.rejects(
    () => service.getAccessByStudentId('00000000-0000-4000-8000-000000000099'),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.statusCode, 404);
      return true;
    },
  );
});

const transitionCases: Array<{
  name: string;
  initial: StudentAccessStatus;
  target: StudentAccessStatus;
  valid: boolean;
}> = [
  { name: 'pending to active is allowed', initial: 'PENDING', target: 'ACTIVE', valid: true },
  { name: 'active to expired is allowed', initial: 'ACTIVE', target: 'EXPIRED', valid: true },
  { name: 'active to revoked is allowed', initial: 'ACTIVE', target: 'REVOKED', valid: true },
  { name: 'pending to expired is rejected', initial: 'PENDING', target: 'EXPIRED', valid: false },
  { name: 'pending to revoked is rejected', initial: 'PENDING', target: 'REVOKED', valid: false },
  { name: 'expired to active is rejected', initial: 'EXPIRED', target: 'ACTIVE', valid: false },
  { name: 'revoked to active is rejected', initial: 'REVOKED', target: 'ACTIVE', valid: false },
];

for (const transition of transitionCases) {
  test(`updateAccessStatus: ${transition.name}`, async () => {
    const repository = new FakeStudentRepository();
    const service = new StudentService(repository);
    const student = repository.seed(createStudentInput());
    const access = await repository.findAccessByStudentId(student.id);
    assert.ok(access !== undefined);
    access.status = transition.initial;

    if (transition.valid) {
      const updated = await service.updateAccessStatus(student.id, transition.target);
      assert.equal(updated?.status, transition.target);
    } else {
      await assert.rejects(
        () => service.updateAccessStatus(student.id, transition.target),
        (error: unknown) => {
          assert.ok(error instanceof ApiError);
          assert.equal(error.statusCode, 422);
          assert.equal(error.code, 'BUSINESS_RULE_ERROR');
          return true;
        },
      );
    }
  });
}

test('activating access sets accessGrantedAt and leaves revokedAt untouched', async () => {
  const repository = new FakeStudentRepository();
  const service = new StudentService(repository);
  const student = repository.seed(createStudentInput());

  const updated = await service.updateAccessStatus(student.id, 'ACTIVE');

  assert.ok(updated !== undefined);
  assert.ok(updated.accessGrantedAt instanceof Date);
  assert.equal(updated.revokedAt, null);
});

test('revoking access sets revokedAt and preserves an earlier accessGrantedAt', async () => {
  const repository = new FakeStudentRepository();
  const service = new StudentService(repository);
  const student = repository.seed(createStudentInput());
  await service.updateAccessStatus(student.id, 'ACTIVE');
  const grantedAt = (await repository.findAccessByStudentId(student.id))?.accessGrantedAt;
  assert.ok(grantedAt instanceof Date);

  const updated = await service.updateAccessStatus(student.id, 'REVOKED');

  assert.ok(updated !== undefined);
  assert.ok(updated.revokedAt instanceof Date);
  assert.deepEqual(updated.accessGrantedAt, grantedAt);
});

test('expiring access changes neither accessGrantedAt nor revokedAt', async () => {
  const repository = new FakeStudentRepository();
  const service = new StudentService(repository);
  const student = repository.seed(createStudentInput());
  await service.updateAccessStatus(student.id, 'ACTIVE');
  const before = await repository.findAccessByStudentId(student.id);
  assert.ok(before !== undefined);

  const updated = await service.updateAccessStatus(student.id, 'EXPIRED');

  assert.ok(updated !== undefined);
  assert.deepEqual(updated.accessGrantedAt, before.accessGrantedAt);
  assert.equal(updated.revokedAt, null);
});

test('update applies only provided fields and reports missing students as not found', async () => {
  const repository = new FakeStudentRepository();
  const service = new StudentService(repository);
  const student = repository.seed(createStudentInput());

  const updated = await service.update(student.id, { name: 'Renamed Student', mobile: '9999999999' });
  assert.equal(updated?.name, 'Renamed Student');
  assert.equal(updated?.mobile, '9999999999');
  assert.equal(updated?.batchId, 'BATCH01');

  await assert.rejects(
    () => service.update('00000000-0000-4000-8000-000000000099', { name: 'Ghost' }),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.statusCode, 404);
      return true;
    },
  );
});
