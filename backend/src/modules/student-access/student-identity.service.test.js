import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError } from '../../utils/api-error.js';
import { StudentIdentityService } from './student-identity.service.js';
const profile = (id) => ({
    id,
    studentId: `PRN-${id.slice(-3)}`,
    name: 'Student',
    email: null,
    mobile: null,
    instituteId: 'INST001',
    batchId: 'B001',
    photoPath: null,
    courseInfo: null,
    createdAt: new Date(),
    updatedAt: new Date(),
});
const access = (studentProfileId, status) => ({
    id: studentProfileId,
    studentProfileId,
    authUserId: null,
    status,
    accessGrantedAt: null,
    accessExpiryAt: null,
    revokedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
});
const directory = new Map([
    ['auth-active', { profile: profile('11111111-1111-4111-8111-000000000001'), access: access('11111111-1111-4111-8111-000000000001', 'ACTIVE') }],
    ['auth-pending', { profile: profile('22222222-2222-4222-8222-000000000002'), access: access('22222222-2222-4222-8222-000000000002', 'PENDING') }],
    ['auth-revoked', { profile: profile('33333333-3333-4333-8333-000000000003'), access: access('33333333-3333-4333-8333-000000000003', 'REVOKED') }],
]);
const service = new StudentIdentityService(async (authUserId) => directory.get(authUserId));
test('resolve maps a linked auth identity to its own profile and access', async () => {
    const resolved = await service.resolve('auth-active');
    assert.ok(resolved !== undefined);
    assert.equal(resolved.access.status, 'ACTIVE');
});
test('resolve returns undefined for an unmapped identity', async () => {
    assert.equal(await service.resolve('auth-stranger'), undefined);
});
test('requireActive passes for ACTIVE access and returns the same identity', async () => {
    const resolved = await service.requireActive('auth-active');
    assert.equal(resolved.profile.id, '11111111-1111-4111-8111-000000000001');
});
test('requireActive rejects unmapped identities with a distinct error code', async () => {
    await assert.rejects(() => service.requireActive('auth-stranger'), (error) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.statusCode, 403);
        assert.equal(error.code, 'STUDENT_IDENTITY_NOT_LINKED');
        return true;
    });
});
for (const authUserId of ['auth-pending', 'auth-revoked']) {
    test(`requireActive rejects ${authUserId.replace('auth-', '')} access`, async () => {
        await assert.rejects(() => service.requireActive(authUserId), (error) => {
            assert.ok(error instanceof ApiError);
            assert.equal(error.statusCode, 403);
            assert.equal(error.code, authUserId === 'auth-revoked' ? 'STUDENT_ACCESS_REVOKED' : 'STUDENT_ACCESS_INACTIVE');
            return true;
        });
    });
}
