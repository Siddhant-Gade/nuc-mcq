import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import test from 'node:test';
process.env.DATABASE_URL = 'postgresql://postgres:placeholder@db.example.supabase.co:5432/postgres';
process.env.NODE_ENV = 'test';
process.env.SUPABASE_JWT_ISSUER = 'https://project.example.supabase.co/auth/v1';
process.env.SUPABASE_JWT_AUDIENCE = 'authenticated';
const [{ default: express }, { createAuthenticationMiddleware }, { errorMiddleware }, { successResponse }] = await Promise.all([
    import('express'),
    import('./auth.middleware.js'),
    import('./error.middleware.js'),
    import('../utils/api-response.js'),
]);
const verifier = {
    verify: async (token) => {
        if (token !== 'verified-token') {
            throw new Error('Invalid token');
        }
        return { authUserId: 'verified-user-id', roles: [] };
    },
};
const startFixture = async () => {
    const app = express();
    app.use(express.json());
    app.get('/protected', createAuthenticationMiddleware(verifier), (request, response) => {
        response.status(200).json(successResponse({ authUserId: request.auth?.authUserId }));
    });
    app.use(errorMiddleware);
    const server = createServer(app);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    assert.ok(address !== null && typeof address !== 'string');
    return {
        url: `http://127.0.0.1:${address.port}`,
        close: async () => {
            server.close();
            await once(server, 'close');
        },
    };
};
test('protected endpoint rejects a missing token', async () => {
    const fixture = await startFixture();
    try {
        const response = await fetch(`${fixture.url}/protected`);
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
test('verified token identity overrides client-supplied identity', async () => {
    const fixture = await startFixture();
    try {
        const response = await fetch(`${fixture.url}/protected?authUserId=impersonated-user-id`, {
            headers: { authorization: 'Bearer verified-token' },
        });
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), {
            success: true,
            data: { authUserId: 'verified-user-id' },
        });
    }
    finally {
        await fixture.close();
    }
});
