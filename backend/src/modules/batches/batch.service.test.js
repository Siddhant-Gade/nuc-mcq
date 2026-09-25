import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError } from '../../utils/api-error.js';
import { BatchService, deriveEffectiveStatus } from './batch.service.js';
const uniqueViolation = () => Object.assign(new Error('duplicate key value'), { code: '23505' });
class FakeBatchRepository {
    batches = [];
    assignedStudentsByBatchId = new Map();
    now() {
        return new Date();
    }
    seed(input) {
        const record = {
            status: 'ACTIVE',
            createdAt: this.now(),
            updatedAt: this.now(),
            ...input,
        };
        this.batches.push(record);
        return record;
    }
    async list() {
        return this.batches.map((batch) => ({
            ...batch,
            enrolledCount: this.assignedStudentsByBatchId.get(batch.batchId) ?? 0,
        }));
    }
    async findById(batchId) {
        return this.batches.find((batch) => batch.batchId === batchId);
    }
    async countAssignedStudents(batchId) {
        return this.assignedStudentsByBatchId.get(batchId) ?? 0;
    }
    async create(input) {
        if (this.batches.some((batch) => batch.batchId === input.batchId)) {
            throw uniqueViolation();
        }
        const record = { ...input, status: 'ACTIVE', createdAt: this.now(), updatedAt: this.now() };
        this.batches.push(record);
        return record;
    }
    async remove(batchId) {
        const index = this.batches.findIndex((batch) => batch.batchId === batchId);
        if (index === -1) {
            return undefined;
        }
        const [removed] = this.batches.splice(index, 1);
        assert.ok(removed !== undefined);
        return removed;
    }
}
const createBatchInput = (overrides = {}) => ({
    batchId: 'B100',
    batchName: 'New Batch',
    instituteId: 'INST001',
    capacity: 30,
    ...overrides,
});
test('deriveEffectiveStatus: stored INACTIVE always wins over enrollment arithmetic', () => {
    assert.equal(deriveEffectiveStatus('INACTIVE', 0, 30), 'INACTIVE');
    assert.equal(deriveEffectiveStatus('INACTIVE', 30, 30), 'INACTIVE');
});
test('deriveEffectiveStatus: FULL exactly at capacity and beyond', () => {
    assert.equal(deriveEffectiveStatus('ACTIVE', 30, 30), 'FULL');
    assert.equal(deriveEffectiveStatus('ACTIVE', 31, 30), 'FULL');
});
test('deriveEffectiveStatus: ACTIVE below capacity regardless of stored ACTIVE/FULL flag', () => {
    assert.equal(deriveEffectiveStatus('ACTIVE', 24, 30), 'ACTIVE');
    assert.equal(deriveEffectiveStatus('FULL', 5, 30), 'ACTIVE');
});
test('create returns the batch as available with zero enrollment', async () => {
    const repository = new FakeBatchRepository();
    const service = new BatchService(repository);
    const created = await service.create(createBatchInput());
    assert.equal(created.batchId, 'B100');
    assert.equal(created.status, 'ACTIVE');
    assert.equal(created.enrolledCount, 0);
});
test('create rejects a duplicate batch ID with a conflict error', async () => {
    const repository = new FakeBatchRepository();
    const service = new BatchService(repository);
    await service.create(createBatchInput());
    await assert.rejects(() => service.create(createBatchInput({ batchName: 'Duplicate' })), (error) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.statusCode, 409);
        assert.equal(error.code, 'CONFLICT');
        return true;
    });
});
test('getById reports a full batch when aggregate enrollment reaches capacity', async () => {
    const repository = new FakeBatchRepository();
    const service = new BatchService(repository);
    repository.seed(createBatchInput());
    repository.assignedStudentsByBatchId.set('B100', 30);
    const batch = await service.getById('B100');
    assert.equal(batch.status, 'FULL');
    assert.equal(batch.enrolledCount, 30);
});
test('getById throws not found for an unknown batch', async () => {
    const service = new BatchService(new FakeBatchRepository());
    await assert.rejects(() => service.getById('GHOST'), (error) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.statusCode, 404);
        return true;
    });
});
test('listAvailableForAdmission excludes full and manually deactivated batches', async () => {
    const repository = new FakeBatchRepository();
    const service = new BatchService(repository);
    repository.seed({ batchId: 'B001', batchName: 'Open', instituteId: 'INST001', capacity: 30 });
    repository.seed({ batchId: 'B002', batchName: 'Packed', instituteId: 'INST001', capacity: 10 });
    repository.seed({
        batchId: 'B003',
        batchName: 'Retired',
        instituteId: 'INST001',
        capacity: 20,
        status: 'INACTIVE',
    });
    repository.assignedStudentsByBatchId.set('B002', 10);
    const available = await service.listAvailableForAdmission();
    assert.deepEqual(available.map((batch) => batch.batchId), ['B001']);
});
test('removing an unassigned empty batch succeeds', async () => {
    const repository = new FakeBatchRepository();
    const service = new BatchService(repository);
    repository.seed(createBatchInput());
    await service.remove('B100');
    assert.equal(await repository.findById('B100'), undefined);
});
test('removing an unknown batch throws not found', async () => {
    const service = new BatchService(new FakeBatchRepository());
    await assert.rejects(() => service.remove('GHOST'), (error) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.statusCode, 404);
        return true;
    });
});
test('removal is blocked while students are assigned to the batch', async () => {
    const repository = new FakeBatchRepository();
    const service = new BatchService(repository);
    repository.seed(createBatchInput());
    repository.assignedStudentsByBatchId.set('B100', 12);
    await assert.rejects(() => service.remove('B100'), (error) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.statusCode, 409);
        assert.equal(error.code, 'CONFLICT');
        assert.match(error.message, /12 student/);
        return true;
    });
    assert.ok((await repository.findById('B100')) !== undefined);
});
