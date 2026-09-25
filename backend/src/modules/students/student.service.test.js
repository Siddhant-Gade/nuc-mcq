import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError } from '../../utils/api-error.js';
import { StudentService } from './student.service.js';
const uniqueViolation = () => Object.assign(new Error('duplicate key value'), { code: '23505' });
class FakeStudentRepository {
    students = [];
    accessRecords = [];
    sequence = 0;
    nextId() {
        this.sequence += 1;
        return `00000000-0000-4000-8000-${String(this.sequence).padStart(12, '0')}`;
    }
    toRecord(profile) {
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
    toAccess(studentProfileId) {
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
    seed(input) {
        const student = this.toRecord(input);
        this.students.push(student);
        this.accessRecords.push(this.toAccess(student.id));
        return student;
    }
    async list() {
        return this.students.map((student) => ({
            ...student,
            accessStatus: this.accessRecords.find((access) => access.studentProfileId === student.id)?.status ?? 'PENDING',
        }));
    }
    async findById(id) {
        return this.students.find((student) => student.id === id);
    }
    async findByAuthUserId(authUserId) {
        const access = this.accessRecords.find((record) => record.authUserId === authUserId);
        if (access === undefined) {
            return undefined;
        }
        const profile = this.students.find((student) => student.id === access.studentProfileId);
        return profile === undefined ? undefined : { profile, access };
    }
    async findByEmail(email) {
        const profile = this.students.find((s) => s.email?.toLowerCase() === email.toLowerCase());
        if (!profile)
            return undefined;
        const access = this.accessRecords.find((a) => a.studentProfileId === profile.id) ?? this.toAccess(profile.id);
        return { profile, access };
    }
    async findByStudentId(studentId) {
        const profile = this.students.find((s) => s.studentId.toLowerCase() === studentId.toLowerCase());
        if (!profile)
            return undefined;
        const access = this.accessRecords.find((a) => a.studentProfileId === profile.id) ?? this.toAccess(profile.id);
        return { profile, access };
    }
    async delete(id) {
        const idx = this.students.findIndex((s) => s.id === id);
        if (idx === -1)
            return false;
        this.students.splice(idx, 1);
        this.accessRecords = this.accessRecords.filter((a) => a.studentProfileId !== id);
        return true;
    }
    async registerStudentAuth(prnOrEmail) {
        const found = (await this.findByStudentId(prnOrEmail)) ?? (await this.findByEmail(prnOrEmail));
        if (!found)
            throw new Error('STUDENT_NOT_FOUND');
        return { ...found, authEmail: `${found.profile.studentId.toLowerCase()}@student.unique` };
    }
    async findAccessByStudentId(studentProfileId) {
        return this.accessRecords.find((access) => access.studentProfileId === studentProfileId);
    }
    async create(input) {
        if (this.students.some((student) => student.studentId === input.studentId)) {
            throw uniqueViolation();
        }
        const student = this.toRecord(input);
        this.students.push(student);
        const access = this.toAccess(student.id);
        this.accessRecords.push(access);
        return { ...student, accessStatus: access.status };
    }
    async update(id, input) {
        const student = this.students.find((candidate) => candidate.id === id);
        if (student === undefined) {
            return undefined;
        }
        const updated = { ...student, ...input, updatedAt: new Date() };
        this.students[this.students.indexOf(student)] = updated;
        return updated;
    }
    // Mirrors DrizzleStudentRepository.updateAccessStatus timestamp behavior.
    async updateAccessStatus(id, status) {
        const access = this.accessRecords.find((record) => record.studentProfileId === id);
        if (access === undefined) {
            return undefined;
        }
        const now = new Date();
        access.status = status;
        access.updatedAt = now;
        if (status === 'ACTIVE') {
            access.accessGrantedAt = now;
        }
        else if (status === 'REVOKED') {
            access.revokedAt = now;
        }
        return access;
    }
}
const createStudentInput = (overrides = {}) => ({
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
    await assert.rejects(() => service.create(createStudentInput({ name: 'Duplicate' })), (error) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.statusCode, 409);
        assert.equal(error.code, 'CONFLICT');
        return true;
    });
});
test('getById throws not found for an unknown student', async () => {
    const service = new StudentService(new FakeStudentRepository());
    await assert.rejects(() => service.getById('00000000-0000-4000-8000-000000000099'), (error) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.statusCode, 404);
        return true;
    });
});
test('getAccessByStudentId throws not found when the student does not exist', async () => {
    const service = new StudentService(new FakeStudentRepository());
    await assert.rejects(() => service.getAccessByStudentId('00000000-0000-4000-8000-000000000099'), (error) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.statusCode, 404);
        return true;
    });
});
const transitionCases = [
    { name: 'pending to active is allowed', initial: 'PENDING', target: 'ACTIVE', valid: true },
    { name: 'active to expired is allowed', initial: 'ACTIVE', target: 'EXPIRED', valid: true },
    { name: 'active to revoked is allowed', initial: 'ACTIVE', target: 'REVOKED', valid: true },
    { name: 'revoked to pending is allowed', initial: 'REVOKED', target: 'PENDING', valid: true },
    { name: 'revoked to active is allowed', initial: 'REVOKED', target: 'ACTIVE', valid: true },
    { name: 'pending to expired is rejected', initial: 'PENDING', target: 'EXPIRED', valid: false },
    { name: 'pending to revoked is rejected', initial: 'PENDING', target: 'REVOKED', valid: false },
    { name: 'expired to active is rejected', initial: 'EXPIRED', target: 'ACTIVE', valid: false },
    { name: 'revoked to expired is rejected', initial: 'REVOKED', target: 'EXPIRED', valid: false },
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
        }
        else {
            await assert.rejects(() => service.updateAccessStatus(student.id, transition.target), (error) => {
                assert.ok(error instanceof ApiError);
                assert.equal(error.statusCode, 422);
                assert.equal(error.code, 'BUSINESS_RULE_ERROR');
                return true;
            });
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
    await assert.rejects(() => service.update('00000000-0000-4000-8000-000000000099', { name: 'Ghost' }), (error) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.statusCode, 404);
        return true;
    });
});
