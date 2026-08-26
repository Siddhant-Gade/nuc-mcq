import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import test from 'node:test';
import { z } from 'zod';

process.env.DATABASE_URL = 'postgresql://postgres:placeholder@db.example.supabase.co:5432/postgres';
process.env.NODE_ENV = 'test';
process.env.SUPABASE_JWT_ISSUER = 'https://project.example.supabase.co/auth/v1';
process.env.SUPABASE_JWT_AUDIENCE = 'authenticated';

const [{ default: express }, { errorMiddleware }, { validateRequest }, { successResponse }] = await Promise.all([
  import('express'),
  import('./error.middleware.js'),
  import('./validation.middleware.js'),
  import('../utils/api-response.js'),
]);

const startFixture = async (): Promise<{ url: string; close: () => Promise<void> }> => {
  const app = express();
  app.use(express.json());
  app.post('/validate', validateRequest({ body: z.object({ name: z.string().min(1) }) }), (_request, response) => {
    response.status(200).json(successResponse(response.locals.validated.body));
  });
  app.get(
    '/validate/:id',
    validateRequest({
      params: z.object({ id: z.uuid() }),
      query: z.object({ limit: z.coerce.number().int().positive() }),
    }),
    (_request, response) => {
      response.status(200).json(successResponse(response.locals.validated));
    },
  );
  app.get('/unexpected', () => {
    throw new Error('internal implementation detail');
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

test('invalid Zod input reaches the central error middleware', async () => {
  const fixture = await startFixture();

  try {
    const response = await fetch(`${fixture.url}/validate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Request validation failed.' },
    });
  } finally {
    await fixture.close();
  }
});

test('validated params and query values are made available to controllers', async () => {
  const fixture = await startFixture();
  const id = '11111111-1111-4111-8111-111111111111';

  try {
    const response = await fetch(`${fixture.url}/validate/${id}?limit=2`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      success: true,
      data: { params: { id }, query: { limit: 2 } },
    });
  } finally {
    await fixture.close();
  }
});

test('unexpected errors do not expose internal details', async () => {
  const fixture = await startFixture();

  try {
    const response = await fetch(`${fixture.url}/unexpected`);

    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected server error occurred.',
      },
    });
  } finally {
    await fixture.close();
  }
});
