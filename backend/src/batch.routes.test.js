import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import test from 'node:test';
import { ApiError } from './utils/api-error.js';
process.env.DATABASE_URL = 'postgresql://postgres:placeholder@db.example.supabase.co:5432/postgres';
process.env.NODE_ENV = 'test';
process.env.SUPABASE_JWT_ISSUER = 'https://project.example.supabase.co/auth/v1';
process.env.SUPABASE_JWT_AUDIENCE = 'authenticated';
const [{ createApp }, { BatchService }] = await Promise.all([
    import('./app.js'),
    import('./modules/batches/batch.service.js'),
]);
class StubBatchService extends BatchService {
    createCalls = [];
    removeCalls = [];
    constructor() {
        super({});
    }
    async list() {
        return [];
    }
    async listAvailableForAdmission() {
        return [];
    }
    async getById(batchId) {
        throw new ApiError(404, 'NOT_FOUND', `No batch ${batchId} in stub.`);
    }
    async create(input) {
        this.createCalls.push(input);
        const now = new Date();
        return {
            ...input,
            enrolledCount: 0,
            status: 'ACTIVE',
            createdAt: now,
            updatedAt: now,
        };
    }
    async remove(batchId) {
        this.removeCalls.push(batchId);
    }
}
const verifierForRoles = (roles) => ({
    verify: async (accessToken) => {
        if (accessToken !== 'verified-token') {
            throw new Error('Invalid token');
        }
        return { authUserId: 'verified-user-id', roles };
    },
});
const startFixture = async (service, tokenVerifier) => {
    const app = createApp({
        allowedCorsOrigins: ['http://localhost:5173'],
        tokenVerifier,
        studentService: {},
        batchService: service,
        authorizationRequestService: {},
        dashboardService: {},
        studentIdentityService: {},
        resultService: {},
        broadcastService: {},
        notificationService: {},
        studyMaterialService: {},
    });
    const server = createServer(app);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    return {
        url: `http://127.0.0.1:${address.port}`,
        close: async () => {
            server.close();
            await once(server, 'close');
        },
    };
};
const adminFixture = async () => {
    const service = new StubBatchService();
    const fixture = await startFixture(service, verifierForRoles(['ADMIN']));
    return { service, ...fixture };
};
test('batch routes require authentication', async () => {
    const fixture = await adminFixture();
    try {
        const response = await fetch(`${fixture.url}/api/v1/batches`);
        assert.equal(response.status, 401);
        assert.deepEqual(await response.json(), {
            success: false,
            error: { code: 'AUTHENTICATION_ERROR', message: 'Authentication token is required.' },
        });
    }
    finally {
        await fixture.close();
    }
});
test('batch routes reject non-admin roles', async () => {
    const service = new StubBatchService();
    const fixture = await startFixture(service, verifierForRoles(['STUDENT']));
    try {
        const response = await fetch(`${fixture.url}/api/v1/batches`, {
            headers: { authorization: 'Bearer verified-token' },
        });
        assert.equal(response.status, 403);
        assert.equal((await response.json()).error.code, 'AUTHORIZATION_ERROR');
        assert.equal(service.createCalls.length, 0);
    }
    finally {
        await fixture.close();
    }
});
test('creating a batch with zero capacity returns a validation error', async () => {
    const fixture = await adminFixture();
    try {
        const response = await fetch(`${fixture.url}/api/v1/batches`, {
            method: 'POST',
            headers: { authorization: 'Bearer verified-token', 'content-type': 'application/json' },
            body: JSON.stringify({ batchId: 'B001', batchName: 'Zero', instituteId: 'INST001', capacity: 0 }),
        });
        assert.equal(response.status, 400);
        assert.equal((await response.json()).error.code, 'VALIDATION_ERROR');
    }
    finally {
        await fixture.close();
    }
});
test('creating a batch without an institute ID returns a validation error', async () => {
    const fixture = await adminFixture();
    try {
        const response = await fetch(`${fixture.url}/api/v1/batches`, {
            method: 'POST',
            headers: { authorization: 'Bearer verified-token', 'content-type': 'application/json' },
            body: JSON.stringify({ batchId: 'B001', batchName: 'No Institute', capacity: 10 }),
        });
        assert.equal(response.status, 400);
    }
    finally {
        await fixture.close();
    }
});
test('a valid creation returns 201 and strips client-supplied enrollment/status keys', async () => {
    const fixture = await adminFixture();
    try {
        // The current React UI sends the full Batch object minus timestamps.
        const uiPayload = {
            batchId: 'B777',
            batchName: 'UI Batch',
            instituteId: 'INST001',
            capacity: 25,
            enrolledCount: 99,
            status: 'FULL',
        };
        const response = await fetch(`${fixture.url}/api/v1/batches`, {
            method: 'POST',
            headers: { authorization: 'Bearer verified-token', 'content-type': 'application/json' },
            body: JSON.stringify(uiPayload),
        });
        assert.equal(response.status, 201);
        const body = (await response.json());
        assert.equal(body.success, true);
        assert.equal(body.data.batchId, 'B777');
        // Only server-owned canonical fields reach the service.
        assert.deepEqual(fixture.service.createCalls, [
            { batchId: 'B777', batchName: 'UI Batch', instituteId: 'INST001', capacity: 25 },
        ]);
    }
    finally {
        await fixture.close();
    }
});
test('the active-batches endpoint is available to admins', async () => {
    const fixture = await adminFixture();
    try {
        const response = await fetch(`${fixture.url}/api/v1/batches/active`, {
            headers: { authorization: 'Bearer verified-token' },
        });
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), { success: true, data: [] });
    }
    finally {
        await fixture.close();
    }
});
test('deleting a batch returns a success acknowledgement and forwards the identifier', async () => {
    const fixture = await adminFixture();
    try {
        const response = await fetch(`${fixture.url}/api/v1/batches/B001`, {
            method: 'DELETE',
            headers: { authorization: 'Bearer verified-token' },
        });
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), { success: true, data: { deleted: true } });
        assert.deepEqual(fixture.service.removeCalls, ['B001']);
    }
    finally {
        await fixture.close();
    }
});
