import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError } from '../../utils/api-error.js';
import { AuthorizationRequestService } from './authorization.service.js';
class FakeAuthorizationRequestRepository {
    requests = [];
    accessMissingFor = new Set();
    approvedWithReviewer = [];
    seed(overrides) {
        const record = {
            id: overrides.id ?? `00000000-0000-4000-8000-${String(this.requests.length + 1).padStart(12, '0')}`,
            studentProfileId: overrides.studentProfileId ?? '00000000-0000-4000-8000-000000009001',
            authUserId: overrides.authUserId ?? null,
            requestedAt: overrides.requestedAt ?? new Date(),
            status: overrides.status ?? 'PENDING',
            reviewedAt: overrides.reviewedAt ?? null,
            reviewedBy: overrides.reviewedBy ?? null,
        };
        this.requests.push(record);
        return record;
    }
    async list() {
        return this.requests.map(this.toView);
    }
    async listByStatus(status) {
        return this.requests.filter((request) => request.status === status).map(this.toView);
    }
    async findById(id) {
        return this.requests.find((request) => request.id === id);
    }
    async findViewById(id) {
        const record = await this.findById(id);
        return record ? this.toView(record) : undefined;
    }
    async findPendingByAuthUserId(authUserId) {
        return this.requests.find((request) => request.authUserId === authUserId && request.status === 'PENDING');
    }
    async create(studentProfileId, authUserId) {
        return this.seed({ studentProfileId, authUserId, status: 'PENDING' });
    }
    async approve(id, reviewedBy) {
        const request = await this.findById(id);
        if (request === undefined || request.status !== 'PENDING') {
            return undefined;
        }
        this.approvedWithReviewer.push(reviewedBy);
        if (this.accessMissingFor.has(id)) {
            request.status = 'APPROVED';
            request.reviewedAt = new Date();
            request.reviewedBy = reviewedBy;
            return { record: request, accessUpdated: false };
        }
        request.status = 'APPROVED';
        request.reviewedAt = new Date();
        request.reviewedBy = reviewedBy;
        return { record: request, accessUpdated: true };
    }
    async reject(id, reviewedBy) {
        const request = await this.findById(id);
        if (request === undefined || request.status !== 'PENDING') {
            return undefined;
        }
        request.status = 'REJECTED';
        request.reviewedAt = new Date();
        request.reviewedBy = reviewedBy;
        return request;
    }
    toView(request) {
        return {
            ...request,
            studentName: 'Seeded Student',
            studentId: 'PRN001',
            prn: 'PRN001',
        };
    }
}
const REVIEWER = 'verified-user-id';
test('approve transitions a pending request and stamps the server-derived reviewer', async () => {
    const repository = new FakeAuthorizationRequestRepository();
    const service = new AuthorizationRequestService(repository);
    const seeded = repository.seed({ authUserId: '11111111-2222-4333-8444-555555555555' });
    const reviewed = await service.approve(seeded.id, REVIEWER);
    assert.equal(reviewed.status, 'APPROVED');
    assert.equal(reviewed.reviewedBy, REVIEWER);
    assert.ok(reviewed.reviewedAt instanceof Date);
    assert.deepEqual(repository.approvedWithReviewer, [REVIEWER]);
});
test('approve rejects an unknown request with not found', async () => {
    const service = new AuthorizationRequestService(new FakeAuthorizationRequestRepository());
    await assert.rejects(() => service.approve('00000000-0000-4000-8000-000000000099', REVIEWER), (error) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.statusCode, 404);
        return true;
    });
});
test('approve conflicts when the request was already approved', async () => {
    const repository = new FakeAuthorizationRequestRepository();
    const service = new AuthorizationRequestService(repository);
    const seeded = repository.seed({ status: 'APPROVED' });
    await assert.rejects(() => service.approve(seeded.id, REVIEWER), (error) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.statusCode, 409);
        assert.match(error.message, /already been approved/);
        return true;
    });
});
test('approve still completes when the access row is missing (documented drift behavior)', async () => {
    const repository = new FakeAuthorizationRequestRepository();
    const service = new AuthorizationRequestService(repository);
    const seeded = repository.seed({});
    repository.accessMissingFor.add(seeded.id);
    const reviewed = await service.approve(seeded.id, REVIEWER);
    assert.equal(reviewed.status, 'APPROVED');
    assert.equal(reviewed.reviewedBy, REVIEWER);
});
test('reject transitions a pending request without touching access semantics', async () => {
    const repository = new FakeAuthorizationRequestRepository();
    const service = new AuthorizationRequestService(repository);
    const seeded = repository.seed({});
    const reviewed = await service.reject(seeded.id, REVIEWER);
    assert.equal(reviewed.status, 'REJECTED');
    assert.equal(reviewed.reviewedBy, REVIEWER);
});
test('reject conflicts when the request was already rejected', async () => {
    const repository = new FakeAuthorizationRequestRepository();
    const service = new AuthorizationRequestService(repository);
    const seeded = repository.seed({ status: 'REJECTED' });
    await assert.rejects(() => service.reject(seeded.id, REVIEWER), (error) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.statusCode, 409);
        return true;
    });
});
test('list returns every request and list(PENDING) filters correctly', async () => {
    const repository = new FakeAuthorizationRequestRepository();
    const service = new AuthorizationRequestService(repository);
    repository.seed({ status: 'PENDING' });
    repository.seed({ status: 'APPROVED' });
    const all = await service.list();
    const pendingOnly = await service.list('PENDING');
    assert.equal(all.length, 2);
    assert.equal(pendingOnly.length, 1);
    assert.equal(pendingOnly[0]?.status, 'PENDING');
});
