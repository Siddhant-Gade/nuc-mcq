import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError } from '../../utils/api-error.js';
import { BroadcastService } from './broadcast.service.js';
const ADMIN_ID = '00000000-0000-4000-8000-00000000a001';
class FakeBroadcastRepository {
    rows = [];
    sequence = 0;
    async list() {
        return this.rows.map((row) => ({ ...row, targetBatchIds: [...row.targetBatchIds] }));
    }
    async listPublishedForStudent(batchId) {
        return this.rows
            .filter((row) => row.status === 'PUBLISHED')
            .filter((row) => row.audienceType === 'ALL' || row.targetBatchIds.includes(batchId))
            .map((row) => ({ ...row, targetBatchIds: [...row.targetBatchIds] }));
    }
    async getById(id) {
        const row = this.rows.find((candidate) => candidate.id === id);
        return row === undefined ? undefined : { ...row, targetBatchIds: [...row.targetBatchIds] };
    }
    async findExistingBatchIds(batchIds) {
        const known = new Set(this.rows.flatMap((row) => row.targetBatchIds));
        known.add('BATCH-001');
        return [...new Set(batchIds)].filter((batchId) => known.has(batchId));
    }
    async insert(record, targetBatchIds) {
        this.sequence += 1;
        const inserted = {
            ...record,
            id: `broadcast-${this.sequence}`,
            createdAt: new Date(),
            updatedAt: new Date(),
            targetBatchIds: [...targetBatchIds],
        };
        this.rows.push(inserted);
        return inserted;
    }
    async update(id, fields, replacementTargetBatchIds) {
        const index = this.rows.findIndex((row) => row.id === id);
        if (index === -1 || this.rows[index] === undefined) {
            return undefined;
        }
        const current = this.rows[index];
        const updated = {
            ...current,
            ...(fields.title !== undefined ? { title: fields.title } : {}),
            ...(fields.message !== undefined ? { message: fields.message } : {}),
            ...(fields.audienceType !== undefined ? { audienceType: fields.audienceType } : {}),
            updatedAt: new Date(),
            targetBatchIds: replacementTargetBatchIds === null ? [...current.targetBatchIds] : [...replacementTargetBatchIds],
        };
        this.rows[index] = updated;
        return updated;
    }
    async markPublished(id) {
        const row = this.rows.find((candidate) => candidate.id === id);
        if (row === undefined || row.status !== 'DRAFT') {
            return undefined;
        }
        row.status = 'PUBLISHED';
        row.publishedAt = new Date();
        row.updatedAt = row.publishedAt;
        return row.publishedAt;
    }
    async existsById(id) {
        return this.rows.some((row) => row.id === id);
    }
    async removeById(id) {
        const before = this.rows.length;
        this.rows = this.rows.filter((row) => row.id !== id);
        return this.rows.length < before;
    }
}
const serviceWith = (...rows) => {
    const repository = new FakeBroadcastRepository();
    repository.rows.push(...rows);
    return { repository, service: new BroadcastService(repository) };
};
const draftRow = () => ({
    id: 'broadcast-draft',
    title: 'Draft notice',
    message: 'Draft body',
    status: 'DRAFT',
    audienceType: 'BATCH',
    publishedAt: null,
    createdBy: ADMIN_ID,
    createdAt: new Date('2026-08-20T10:00:00Z'),
    updatedAt: new Date('2026-08-20T10:00:00Z'),
    targetBatchIds: ['BATCH-001'],
});
test('creating an ALL broadcast stores it as a DRAFT owned by the JWT-derived admin', async () => {
    const { repository, service } = serviceWith();
    const created = await service.create(ADMIN_ID, {
        title: 'General notice',
        message: 'Body',
        audienceType: 'ALL',
        // Client-supplied targets for an ALL audience must be ignored.
        targetBatchIds: ['BATCH-001'],
    });
    assert.equal(created.status, 'DRAFT');
    assert.equal(created.createdBy, ADMIN_ID);
    assert.equal(created.publishedAt, null);
    assert.deepEqual(created.targetBatchIds, []);
    assert.equal(repository.rows.length, 1);
});
test('creating a BATCH broadcast persists its targets', async () => {
    const { service } = serviceWith();
    const created = await service.create(ADMIN_ID, {
        title: 'Batch notice',
        message: 'Body',
        audienceType: 'BATCH',
        targetBatchIds: ['BATCH-001', 'BATCH-001'], // duplicate collapses
    });
    assert.deepEqual(created.targetBatchIds, ['BATCH-001']);
});
test('unknown batch IDs are rejected with the offending identifiers listed', async () => {
    const { service } = serviceWith();
    await assert.rejects(service.create(ADMIN_ID, {
        title: 'Batch notice',
        message: 'Body',
        audienceType: 'BATCH',
        targetBatchIds: ['BATCH-001', 'GHOST-BATCH'],
    }), (error) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.statusCode, 400);
        assert.match(error.message, /GHOST-BATCH/);
        return true;
    });
});
test('a BATCH broadcast without targets is rejected before any write', async () => {
    const { repository, service } = serviceWith();
    await assert.rejects(service.create(ADMIN_ID, { title: 'Notice', message: 'Body', audienceType: 'BATCH' }), (error) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.statusCode, 400);
        assert.equal(error.code, 'VALIDATION_ERROR');
        return true;
    });
    assert.equal(repository.rows.length, 0);
});
test('published broadcasts remain editable and keep their status', async () => {
    const published = { ...draftRow(), status: 'PUBLISHED', publishedAt: new Date() };
    const { service } = serviceWith(published);
    const edited = await service.update(published.id, { title: 'Corrected headline' });
    assert.equal(edited.status, 'PUBLISHED');
    assert.equal(edited.title, 'Corrected headline');
});
test('switching the audience to ALL clears the targets; switching to BATCH requires them', async () => {
    const { service } = serviceWith(draftRow());
    const asAll = await service.update('broadcast-draft', { audienceType: 'ALL' });
    assert.deepEqual(asAll.targetBatchIds, []);
    await assert.rejects(service.update(asAll.id, { audienceType: 'BATCH' }), (error) => error instanceof ApiError && error.statusCode === 400);
    const backToBatch = await service.update(asAll.id, { audienceType: 'BATCH', targetBatchIds: ['BATCH-001'] });
    assert.deepEqual(backToBatch.targetBatchIds, ['BATCH-001']);
});
test('an empty update payload is rejected', async () => {
    const { service } = serviceWith(draftRow());
    await assert.rejects(service.update('broadcast-draft', {}), (error) => error instanceof ApiError && error.statusCode === 400);
});
test('publishing a DRAFT stamps the timestamp exactly once', async () => {
    const { repository, service } = serviceWith(draftRow());
    const first = await service.publish('broadcast-draft');
    assert.equal(first.status, 'PUBLISHED');
    assert.ok(first.publishedAt instanceof Date);
    await assert.rejects(service.publish('broadcast-draft'), (error) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.statusCode, 409);
        assert.equal(error.code, 'CONFLICT');
        return true;
    });
    const stored = await repository.getById('broadcast-draft');
    assert.equal(stored?.publishedAt?.getTime(), first.publishedAt?.getTime());
});
test('publishing or fetching an unknown broadcast reports not found', async () => {
    const { service } = serviceWith();
    await assert.rejects(service.publish('missing'), (error) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.statusCode, 404);
        return true;
    });
    await assert.rejects(service.getById('missing'), (error) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.statusCode, 404);
        return true;
    });
});
test('deletion is hard and idempotent-unsafe by design: missing ids are 404', async () => {
    const { repository, service } = serviceWith(draftRow());
    await service.remove('broadcast-draft');
    assert.equal(await repository.existsById('broadcast-draft'), false);
    await assert.rejects(service.remove('broadcast-draft'), (error) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.statusCode, 404);
        return true;
    });
});
test('student visibility only returns PUBLISHED rows matching ALL or own batch', async () => {
    const { service } = serviceWith(
    // DRAFT own-batch broadcast must stay invisible.
    draftRow(), {
        ...draftRow(),
        id: 'own-batch-published',
        status: 'PUBLISHED',
        publishedAt: new Date(),
    }, {
        ...draftRow(),
        id: 'all-broadcast',
        audienceType: 'ALL',
        targetBatchIds: [],
        status: 'PUBLISHED',
        publishedAt: new Date(),
    }, {
        ...draftRow(),
        id: 'other-batch-broadcast',
        targetBatchIds: ['BATCH-999'],
        status: 'PUBLISHED',
        publishedAt: new Date(),
    });
    const visible = await service.listForStudent('BATCH-001');
    assert.deepEqual(visible.map((view) => view.id).sort(), ['all-broadcast', 'own-batch-published']);
});
