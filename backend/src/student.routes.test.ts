import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import test from 'node:test';

import type { ApplicationRole, AuthTokenVerifier } from './modules/auth/auth-token-verifier.js';
import type {
  CreateStudentInput,
  StudentAccessRecord,
  StudentWithAccessRecord,
  UpdateStudentInput,
} from './modules/students/student.types.js';

process.env.DATABASE_URL = 'postgresql://postgres:placeholder@db.example.supabase.co:5432/postgres';
process.env.NODE_ENV = 'test';
process.env.SUPABASE_JWT_ISSUER = 'https://project.example.supabase.co/auth/v1';
process.env.SUPABASE_JWT_AUDIENCE = 'authenticated';

const [{ createApp }, { StudentService }] = await Promise.all([import('./app.js'), import('./modules/students/student.service.js')]);
const { ApiError } = await import('./utils/api-error.js');

type RecordedCreate = CreateStudentInput;

class StubStudentService extends StudentService {
  public createCalls: RecordedCreate[] = [];
  public statusCalls: Array<{ id: string; status: string }> = [];

  public constructor() {
    super({} as never);
  }

  public override async list(): Promise<StudentWithAccessRecord[]> {
    return [];
  }

  public override async getById(id: string): Promise<StudentWithAccessRecord> {
    if (id === '00000000-0000-4000-8000-000000004242') {
      const now = new Date();
      return {
        id,
        studentId: 'STU042',
        name: 'Route Student',
        email: null,
        mobile: null,
        instituteId: 'INST001',
        batchId: 'BATCH01',
        photoPath: null,
        courseInfo: null,
        createdAt: now,
        updatedAt: now,
        accessStatus: 'ACTIVE',
      };
    }

    throw new ApiError(404, 'NOT_FOUND', 'Student not found.');
  }

  public override async getAccessByStudentId(): Promise<StudentAccessRecord> {
    throw new ApiError(404, 'NOT_FOUND', 'Student access record not found.');
  }

  public override async create(input: CreateStudentInput): Promise<StudentWithAccessRecord> {
    this.createCalls.push(input);
    const now = new Date();
    return {
      id: '00000000-0000-4000-8000-000000000001',
      ...input,
      email: input.email ?? null,
      mobile: input.mobile ?? null,
      photoPath: input.photoPath ?? null,
      courseInfo: input.courseInfo ?? null,
      createdAt: now,
      updatedAt: now,
      accessStatus: 'PENDING',
    };
  }

  public override async update(id: string, input: UpdateStudentInput): Promise<never> {
    void input;
    throw new ApiError(404, 'NOT_FOUND', `No student ${id} in stub.`);
  }

  public override async updateAccessStatus(id: string, status: never): Promise<never> {
    this.statusCalls.push({ id, status });
    throw new ApiError(422, 'BUSINESS_RULE_ERROR', 'Stub rejection.');
  }
}

const verifierForRoles =
  (roles: ApplicationRole[]): AuthTokenVerifier => ({
    verify: async (accessToken: string) => {
      if (accessToken !== 'verified-token') {
        throw new Error('Invalid token');
      }

      return { authUserId: 'verified-user-id', roles };
    },
  });

const startFixture = async (
  service: StubStudentService,
  tokenVerifier: AuthTokenVerifier,
): Promise<{ url: string; close: () => Promise<void> }> => {
  const app = createApp({
    allowedCorsOrigins: ['http://localhost:5173'],
    tokenVerifier,
    studentService: service,
    batchService: {} as never,
    authorizationRequestService: {} as never,
    dashboardService: {} as never,
    studentIdentityService: {} as never,
  });
  const server = createServer(app);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${address.port}`,
    close: async () => {
      server.close();
      await once(server, 'close');
    },
  };
};

const adminFixture = async (): Promise<{ service: StubStudentService; url: string; close: () => Promise<void> }> => {
  const service = new StubStudentService();
  const fixture = await startFixture(service, verifierForRoles(['ADMIN']));
  return { service, ...fixture };
};

test('student routes require authentication', async () => {
  const fixture = await adminFixture();

  try {
    const response = await fetch(`${fixture.url}/api/v1/students`);
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), {
      success: false,
      error: { code: 'AUTHENTICATION_ERROR', message: 'Authentication token is required.' },
    });
  } finally {
    await fixture.close();
  }
});

test('student routes reject non-admin roles', async () => {
  const service = new StubStudentService();
  const fixture = await startFixture(service, verifierForRoles(['STUDENT' as ApplicationRole]));

  try {
    const response = await fetch(`${fixture.url}/api/v1/students`, {
      headers: { authorization: 'Bearer verified-token' },
    });
    assert.equal(response.status, 403);
    assert.equal(((await response.json()) as { error: { code: string } }).error.code, 'AUTHORIZATION_ERROR');
    assert.equal(service.createCalls.length, 0);
  } finally {
    await fixture.close();
  }
});

test('creating a student with missing required fields returns a validation error', async () => {
  const fixture = await adminFixture();

  try {
    const response = await fetch(`${fixture.url}/api/v1/students`, {
      method: 'POST',
      headers: { authorization: 'Bearer verified-token', 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Incomplete' }),
    });

    assert.equal(response.status, 400);
    assert.equal(((await response.json()) as { error: { code: string } }).error.code, 'VALIDATION_ERROR');
  } finally {
    await fixture.close();
  }
});

test('creating a student with an invalid institute ID type returns a validation error', async () => {
  const fixture = await adminFixture();

  try {
    const response = await fetch(`${fixture.url}/api/v1/students`, {
      method: 'POST',
      headers: { authorization: 'Bearer verified-token', 'content-type': 'application/json' },
      body: JSON.stringify({ studentId: 'S1', name: 'A', instituteId: '', batchId: 'B1' }),
    });

    assert.equal(response.status, 400);
  } finally {
    await fixture.close();
  }
});

test('a valid student creation returns 201 and forwards the validated body', async () => {
  const fixture = await adminFixture();

  try {
    const payload = {
      studentId: 'STU100',
      name: 'New Student',
      instituteId: 'INST001',
      batchId: 'BATCH01',
      email: 'new@example.com',
    };

    const response = await fetch(`${fixture.url}/api/v1/students`, {
      method: 'POST',
      headers: { authorization: 'Bearer verified-token', 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    assert.equal(response.status, 201);
    const body = (await response.json()) as { success: boolean; data: { studentId: string; accessStatus: string } };
    assert.equal(body.success, true);
    assert.equal(body.data.studentId, 'STU100');
    assert.equal(body.data.accessStatus, 'PENDING');
    assert.deepEqual(fixture.service.createCalls, [payload]);
  } finally {
    await fixture.close();
  }
});

test('an invalid student id parameter returns a validation error', async () => {
  const fixture = await adminFixture();

  try {
    const response = await fetch(`${fixture.url}/api/v1/students/not-a-uuid`, {
      headers: { authorization: 'Bearer verified-token' },
    });

    assert.equal(response.status, 400);
    assert.equal(((await response.json()) as { error: { code: string } }).error.code, 'VALIDATION_ERROR');
  } finally {
    await fixture.close();
  }
});

test('an empty update body returns a validation error', async () => {
  const fixture = await adminFixture();

  try {
    const response = await fetch(`${fixture.url}/api/v1/students/00000000-0000-4000-8000-000000004242`, {
      method: 'PATCH',
      headers: { authorization: 'Bearer verified-token', 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });

    assert.equal(response.status, 400);
  } finally {
    await fixture.close();
  }
});

test('an invalid access status enum returns a validation error', async () => {
  const fixture = await adminFixture();

  try {
    const response = await fetch(`${fixture.url}/api/v1/students/00000000-0000-4000-8000-000000004242/access-status`, {
      method: 'PATCH',
      headers: { authorization: 'Bearer verified-token', 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'SUSPENDED' }),
    });

    assert.equal(response.status, 400);
    assert.equal(fixture.service.statusCalls.length, 0);
  } finally {
    await fixture.close();
  }
});
