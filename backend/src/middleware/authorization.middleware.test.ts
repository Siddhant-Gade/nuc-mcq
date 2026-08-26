import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import test from 'node:test';
import type { AuthTokenVerifier } from '../modules/auth/auth-token-verifier.js';

process.env.DATABASE_URL = 'postgresql://postgres:placeholder@db.example.supabase.co:5432/postgres';
process.env.NODE_ENV = 'test';
process.env.SUPABASE_JWT_ISSUER = 'https://project.example.supabase.co/auth/v1';
process.env.SUPABASE_JWT_AUDIENCE = 'authenticated';

const [{ default: express }, { createAuthenticationMiddleware }, { requireRoles }, { errorMiddleware }, { successResponse }] = await Promise.all([
  import('express'),
  import('./auth.middleware.js'),
  import('./authorization.middleware.js'),
  import('./error.middleware.js'),
  import('../utils/api-response.js'),
]);

const verifier: AuthTokenVerifier = {
  verify: async (token: string) => {
    if (token === 'admin-token') {
      return { authUserId: 'admin-id', roles: ['ADMIN'] };
    }

    if (token === 'student-token') {
      return { authUserId: 'student-id', roles: ['STUDENT'] };
    }

    throw new Error('Invalid token');
  },
};

const startFixture = async (): Promise<{ url: string; close: () => Promise<void> }> => {
  const app = express();
  app.get('/admin', createAuthenticationMiddleware(verifier), requireRoles('ADMIN'), (_request, response) => {
    response.status(200).json(successResponse({ access: 'admin' }));
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

test('student identity cannot access an admin-only endpoint', async () => {
  const fixture = await startFixture();

  try {
    const response = await fetch(`${fixture.url}/admin?role=ADMIN`, {
      headers: { authorization: 'Bearer student-token' },
    });

    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), {
      success: false,
      error: {
        code: 'AUTHORIZATION_ERROR',
        message: 'You are not authorized to access this resource.',
      },
    });
  } finally {
    await fixture.close();
  }
});

test('admin identity can access an admin-only endpoint', async () => {
  const fixture = await startFixture();

  try {
    const response = await fetch(`${fixture.url}/admin`, {
      headers: { authorization: 'Bearer admin-token' },
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      success: true,
      data: { access: 'admin' },
    });
  } finally {
    await fixture.close();
  }
});
