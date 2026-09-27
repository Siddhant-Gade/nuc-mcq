import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import test from 'node:test';
import { ApiError } from './utils/api-error.js';
process.env.DATABASE_URL = 'postgresql://postgres:placeholder@db.example.supabase.co:5432/postgres';
process.env.NODE_ENV = 'test';
process.env.SUPABASE_JWT_ISSUER = 'https://project.example.supabase.co/auth/v1';
process.env.SUPABASE_JWT_AUDIENCE = 'authenticated';
const [{ createApp }, { NotificationService }] = await Promise.all([
    import('./app.js'),
    import('./modules/notifications/notification.service.js'),
]);
const USER_ID = '00000000-0000-4000-8000-0000000000c1';
const record = (overrides = {}) => ({
    id: '00000000-0000-4000-8000-000000000d01',
    recipientAuthUserId: USER_ID,
    title: 'Announcement published',
    message: 'Body',
    type: 'announcement',
    relatedRoute: '/',
    isRead: false,
    readAt: null,
    createdAt: new Date('2026-08-26T08:00:00Z'),
    updatedAt: new Date('2026-08-26T08:00:00Z'),
    ...overrides,
});
class StubNotificationService extends NotificationService {
    rows;
    listCalls = [];
    unreadCalls = [];
    markReadCalls = [];
    markAllCalls = [];
    constructor(rows = [record()]) {
        super({});
        this.rows = rows;
    }
    async list(recipientAuthUserId) {
        this.listCalls.push(recipientAuthUserId);
        return this.rows;
    }
    async unreadCount(recipientAuthUserId) {
        this.unreadCalls.push(recipientAuthUserId);
        return this.rows.filter((row) => !row.isRead).length;
    }
    async markRead(recipientAuthUserId, id) {
        const row = this.rows.find((candidate) => candidate.id === id && candidate.recipientAuthUserId === recipientAuthUserId);
        if (row === undefined) {
            throw new ApiError(404, 'NOT_FOUND', `No notification with id ${id} was found for this account.`);
        }
        this.markReadCalls.push({ recipient: recipientAuthUserId, id });
        return row;
    }
    async markAllRead(recipientAuthUserId) {
        this.markAllCalls.push(recipientAuthUserId);
        return { updatedCount: this.rows.length };
    }
}
const startFixture = (roles, service, authUserId = USER_ID) => {
    const tokenVerifier = {
        verify: async (accessToken) => {
            if (accessToken !== 'verified-token') {
                throw new Error('Invalid token');
            }
            return { authUserId, roles };
        },
    };
    const app = createApp({
        allowedCorsOrigins: ['http://localhost:5173'],
        tokenVerifier,
        studentService: {},
        batchService: {},
        authorizationRequestService: {},
        dashboardService: {},
        studentIdentityService: {},
        resultService: {},
        broadcastService: {},
        notificationService: service,
        studyMaterialService: {},
    });
    const server = createServer(app);
    server.listen(0, '127.0.0.1');
    return once(server, 'listening').then(() => {
        const address = server.address();
        return {
            url: `http://127.0.0.1:${address.port}`,
            close: async () => {
                server.close();
                await once(server, 'close');
            },
            service,
        };
    });
};
test('notification routes require authentication', async () => {
    const fixture = await startFixture(['ADMIN'], new StubNotificationService());
    try {
        for (const path of ['/', '/unread-count']) {
            const response = await fetch(`${fixture.url}/api/v1/notifications${path}`);
            assert.equal(response.status, 401, `GET ${path}`);
        }
        const markOne = await fetch(`${fixture.url}/api/v1/notifications/00000000-0000-4000-8000-000000000d01/read`, {
            method: 'PATCH',
        });
        assert.equal(markOne.status, 401);
        const markAll = await fetch(`${fixture.url}/api/v1/notifications/read-all`, { method: 'POST' });
        assert.equal(markAll.status, 401);
    }
    finally {
        await fixture.close();
    }
});
test('any authenticated role can manage its own notifications', async () => {
    const service = new StubNotificationService([record()]);
    const fixture = await startFixture(['STUDENT'], service);
    try {
        const list = await fetch(`${fixture.url}/api/v1/notifications`, {
            headers: { authorization: 'Bearer verified-token' },
        });
        assert.equal(list.status, 200);
        // Dates serialize to ISO strings over JSON.
        const body = (await list.json());
        assert.equal(body.success, true);
        assert.equal(body.data.length, 1);
        assert.equal(body.data[0]?.id, '00000000-0000-4000-8000-000000000d01');
        assert.equal(body.data[0]?.recipientAuthUserId, USER_ID);
        assert.equal(body.data[0]?.isRead, false);
        const unread = await fetch(`${fixture.url}/api/v1/notifications/unread-count`, {
            headers: { authorization: 'Bearer verified-token' },
        });
        assert.equal(unread.status, 200);
        assert.deepEqual(await unread.json(), { success: true, data: { count: 1 } });
        // The recipient is always the verified identity, never client input.
        const markOne = await fetch(`${fixture.url}/api/v1/notifications/00000000-0000-4000-8000-000000000d01/read`, {
            method: 'PATCH',
            headers: { authorization: 'Bearer verified-token', 'content-type': 'application/json' },
            body: JSON.stringify({ recipientAuthUserId: 'spoofed-user-id' }),
        });
        assert.equal(markOne.status, 200);
        assert.deepEqual(fixture.service.markReadCalls, [{ recipient: USER_ID, id: '00000000-0000-4000-8000-000000000d01' }]);
    }
    finally {
        await fixture.close();
    }
});
test('a non-UUID notification id fails validation before reaching the service', async () => {
    const fixture = await startFixture(['ADMIN'], new StubNotificationService());
    try {
        const response = await fetch(`${fixture.url}/api/v1/notifications/not-a-uuid/read`, {
            method: 'PATCH',
            headers: { authorization: 'Bearer verified-token' },
        });
        assert.equal(response.status, 400);
        assert.equal((await response.json()).error.code, 'VALIDATION_ERROR');
        assert.deepEqual(fixture.service.markReadCalls, []);
    }
    finally {
        await fixture.close();
    }
});
test('mark-all-read returns the updated count and forwards the verified identity', async () => {
    const fixture = await startFixture(['ADMIN'], new StubNotificationService([record(), record({ id: 'n2' })]));
    try {
        const response = await fetch(`${fixture.url}/api/v1/notifications/read-all`, {
            method: 'POST',
            headers: { authorization: 'Bearer verified-token' },
        });
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), { success: true, data: { updatedCount: 2 } });
        assert.deepEqual(fixture.service.markAllCalls, [USER_ID]);
    }
    finally {
        await fixture.close();
    }
});
test('marking a foreign or unknown notification reports not found', async () => {
    const fixture = await startFixture(['ADMIN'], new StubNotificationService());
    try {
        const response = await fetch(`${fixture.url}/api/v1/notifications/00000000-0000-4000-8000-00000000ffff/read`, {
            method: 'PATCH',
            headers: { authorization: 'Bearer verified-token' },
        });
        assert.equal(response.status, 404);
        assert.equal((await response.json()).error.code, 'NOT_FOUND');
    }
    finally {
        await fixture.close();
    }
});
