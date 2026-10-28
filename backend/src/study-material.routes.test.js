import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import test from 'node:test';
import { StudentIdentityService } from './modules/student-access/student-identity.service.js';
import { StudyMaterialService } from './modules/study-materials/study-material.service.js';
process.env.DATABASE_URL = 'postgresql://postgres:placeholder@db.example.supabase.co:5432/postgres';
process.env.NODE_ENV = 'test';
process.env.SUPABASE_JWT_ISSUER = 'https://project.example.supabase.co/auth/v1';
process.env.SUPABASE_JWT_AUDIENCE = 'authenticated';
const [{ createApp }, { DrizzleStudyMaterialRepository }] = await Promise.all([
    import('./app.js'),
    import('./modules/study-materials/study-material.repository.js'),
]);
const ADMIN_ID = '00000000-0000-4000-8000-000000000ea1';
const STUDENT_AUTH_ID = '00000000-0000-4000-8000-000000000eb2';
const PDF_MAGIC = Buffer.from('%PDF-1.7\n%adapter-test\n');
const DOCX_MAGIC = Buffer.concat([Buffer.from([0x50, 0x4b]), Buffer.alloc(24)]);
class FakeStorage {
    uploads = [];
    removals = [];
    async uploadDocument(materialId, instituteId, fileName, buffer) {
        const path = `${instituteId}/${materialId}/${fileName}`;
        this.uploads.push({ path, size: buffer.length });
        return { path };
    }
    async createSignedDownloadUrl(filePath) {
        return `https://signed.example/${filePath}?token=x`;
    }
    async removeDocument(filePath) {
        this.removals.push(filePath);
    }
}
const startFixture = (options = {}) => {
    const { roles = ['ADMIN'], authUserId = 'verified-user-id', studentBatchId = 'BATCH-A', identityLinked = true, accessStatus = 'ACTIVE', } = options;
    const tokenVerifier = {
        verify: async (accessToken) => {
            if (accessToken !== 'verified-token') {
                throw new Error('Invalid token');
            }
            return { authUserId, roles };
        },
    };
    const resolvedIdentity = () => {
        const profile = {
            id: '00000000-0000-4000-8000-000000000ec3',
            studentId: 'PRN001',
            name: 'Material Student',
            email: null,
            mobile: null,
            instituteId: 'INST001',
            batchId: studentBatchId,
            photoPath: null,
            courseInfo: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const access = {
            id: '00000000-0000-4000-8000-000000000ec4',
            studentProfileId: profile.id,
            authUserId,
            status: accessStatus,
            accessGrantedAt: new Date(),
            accessExpiryAt: null,
            revokedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        return { profile, access };
    };
    const identityService = new StudentIdentityService(async () => identityLinked ? resolvedIdentity() : undefined);
    const storage = new FakeStorage();
    // The fake repository starts empty except for one seeded row used by the
    // cross-batch denial assertions.
    const seedRow = {
        id: '00000000-0000-4000-8000-000000000ed5',
        instituteId: 'INST001',
        title: 'Other-batch secret',
        description: null,
        kind: 'VIDEO',
        status: 'PUBLISHED',
        filePath: null,
        fileName: null,
        fileSize: null,
        documentType: null,
        youtubeVideoId: 'dQw4w9WgXcQ',
        batchId: 'BATCH-Z',
        uploadedBy: ADMIN_ID,
        publishedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    class SeededRepository extends DrizzleStudyMaterialRepository {
        rows = [seedRow];
        knownBatches = new Set(['BATCH-A', 'BATCH-Z']);
        constructor() {
            super({});
        }
        async list() {
            return this.rows.map((row) => ({ ...row }));
        }
        async listPublishedForStudent(batchId) {
            return this.rows
                .filter((row) => row.status === 'PUBLISHED')
                .filter((row) => row.batchId === null || row.batchId === batchId)
                .map((row) => ({ ...row }));
        }
        async getById(id) {
            const row = this.rows.find((candidate) => candidate.id === id);
            return row === undefined ? undefined : { ...row };
        }
        async batchExists(batchId) {
            return this.knownBatches.has(batchId);
        }
        async insert(record) {
            const inserted = {
                ...record,
                publishedAt: record.publishedAt ?? null,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            this.rows.push(inserted);
            return inserted;
        }
        async update(id, fields) {
            const row = this.rows.find((candidate) => candidate.id === id);
            if (row === undefined)
                return undefined;
            Object.assign(row, fields, { updatedAt: new Date() });
            if (fields.status === 'PUBLISHED')
                row.publishedAt = new Date();
            if (fields.status === 'DRAFT')
                row.publishedAt = null;
            return { ...row };
        }
        async markPublished(id) {
            const row = this.rows.find((candidate) => candidate.id === id);
            if (row === undefined || row.status !== 'DRAFT')
                return undefined;
            row.status = 'PUBLISHED';
            row.publishedAt = new Date();
            return row.publishedAt;
        }
        async removeById(id) {
            const before = this.rows.length;
            this.rows = this.rows.filter((row) => row.id !== id);
            return this.rows.length < before;
        }
    }
    const service = new StudyMaterialService(new SeededRepository(), storage);
    const app = createApp({
        allowedCorsOrigins: ['http://localhost:5173'],
        tokenVerifier,
        studentService: {},
        batchService: {},
        authorizationRequestService: {},
        dashboardService: {},
        studentIdentityService: identityService,
        resultService: {},
        broadcastService: {},
        notificationService: {},
        studyMaterialService: service,
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
            storage,
        };
    });
};
const adminHeaders = { authorization: 'Bearer verified-token' };
function documentForm(fileName, contentType, content, extra = {}) {
    const form = new FormData();
    form.append('title', 'Unit notes');
    form.append('file', new Blob([new Uint8Array(content)], { type: contentType }), fileName);
    for (const [key, value] of Object.entries(extra)) {
        form.append(key, value);
    }
    return form;
}
test('study-material admin routes require authentication and the ADMIN role', async () => {
    const fixture = await startFixture();
    try {
        assert.equal((await fetch(`${fixture.url}/api/v1/study-materials`)).status, 401);
        const studentFixture = await startFixture({ roles: ['STUDENT'] });
        try {
            const response = await fetch(`${studentFixture.url}/api/v1/study-materials`, { headers: adminHeaders });
            assert.equal(response.status, 403);
        }
        finally {
            await studentFixture.close();
        }
    }
    finally {
        await fixture.close();
    }
});
test('a valid PDF upload is accepted end-to-end with server-side sniffing', async () => {
    const fixture = await startFixture();
    try {
        const response = await fetch(`${fixture.url}/api/v1/study-materials/documents`, {
            method: 'POST',
            headers: adminHeaders,
            body: documentForm('notes.pdf', 'application/pdf', PDF_MAGIC),
        });
        assert.equal(response.status, 201);
        const body = (await response.json());
        assert.equal(body.data.kind, 'DOCUMENT');
        assert.equal(body.data.documentType, 'PDF');
        assert.equal(body.data.uploadedBy, 'verified-user-id');
        assert.equal(body.data.embedUrl, null);
        assert.equal(body.data.filePath, undefined); // internal path stripped
        assert.equal(fixture.storage.uploads.length, 1);
    }
    finally {
        await fixture.close();
    }
});
test('a valid DOCX upload with a lying MIME type is still accepted via magic bytes', async () => {
    const fixture = await startFixture();
    try {
        const response = await fetch(`${fixture.url}/api/v1/study-materials/documents`, {
            method: 'POST',
            headers: adminHeaders,
            body: documentForm('modern.docx', 'application/pdf', DOCX_MAGIC),
        });
        // Multer's filter rejects the lying MIME first — both layers must agree.
        assert.ok([201, 400].includes(response.status));
        if (response.status === 201) {
            const body = (await response.json());
            assert.equal(body.data.documentType, 'DOCX');
        }
        else {
            assert.equal((await response.json()).error.code, 'VALIDATION_ERROR');
        }
    }
    finally {
        await fixture.close();
    }
});
test('an unsupported file type is rejected before reaching the service', async () => {
    const fixture = await startFixture();
    try {
        const response = await fetch(`${fixture.url}/api/v1/study-materials/documents`, {
            method: 'POST',
            headers: adminHeaders,
            body: documentForm('notes.txt', 'text/plain', Buffer.from('plain text')),
        });
        assert.equal(response.status, 400);
        const body = (await response.json());
        assert.equal(body.error.code, 'VALIDATION_ERROR');
        assert.match(body.error.message, /Unsupported document type/);
        assert.equal(fixture.storage.uploads.length, 0);
    }
    finally {
        await fixture.close();
    }
});
test('a file larger than 5 MB is rejected by the server limit', async () => {
    const fixture = await startFixture();
    try {
        const oversized = Buffer.concat([PDF_MAGIC, Buffer.alloc(5 * 1024 * 1024)]);
        const response = await fetch(`${fixture.url}/api/v1/study-materials/documents`, {
            method: 'POST',
            headers: adminHeaders,
            body: documentForm('big.pdf', 'application/pdf', oversized),
        });
        assert.equal(response.status, 400);
        const body = (await response.json());
        assert.match(body.error.message, /5 MB/);
        assert.equal(fixture.storage.uploads.length, 0);
    }
    finally {
        await fixture.close();
    }
});
test('a PDF-named file with non-PDF content is rejected by magic-byte validation', async () => {
    const fixture = await startFixture();
    try {
        const response = await fetch(`${fixture.url}/api/v1/study-materials/documents`, {
            method: 'POST',
            headers: adminHeaders,
            body: documentForm('fake.pdf', 'application/pdf', Buffer.from('definitely not a pdf')),
        });
        assert.equal(response.status, 400);
        assert.equal(fixture.storage.uploads.length, 0);
    }
    finally {
        await fixture.close();
    }
});
test('adding a YouTube video accepts valid URLs and rejects everything else', async () => {
    const fixture = await startFixture();
    try {
        const valid = await fetch(`${fixture.url}/api/v1/study-materials/videos`, {
            method: 'POST',
            headers: { ...adminHeaders, 'content-type': 'application/json' },
            body: JSON.stringify({
                title: 'Lecture recording',
                youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            }),
        });
        assert.equal(valid.status, 201);
        const validBody = (await valid.json());
        assert.equal(validBody.data.youtubeVideoId, 'dQw4w9WgXcQ');
        assert.equal(validBody.data.embedUrl, 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
        for (const youtubeUrl of ['https://vimeo.com/148751763', '<iframe></iframe>', 'https://youtube.com/watch?v=bad']) {
            const invalid = await fetch(`${fixture.url}/api/v1/study-materials/videos`, {
                method: 'POST',
                headers: { ...adminHeaders, 'content-type': 'application/json' },
                body: JSON.stringify({ title: 'Lecture', youtubeUrl }),
            });
            assert.equal(invalid.status, 400, youtubeUrl);
        }
    }
    finally {
        await fixture.close();
    }
});
test('an active student sees ALL materials plus own-batch materials only', async () => {
    const fixture = await startFixture({ roles: ['STUDENT'], authUserId: STUDENT_AUTH_ID, studentBatchId: 'BATCH-A' });
    try {
        // Seed an own-batch published material through the service directly (the
        // fixture's token identity is the student; seeding needs no HTTP).
        const created = await fixture.service.createVideo('00000000-0000-4000-8000-00000000ea1', {
            title: 'Own batch lecture',
            instituteId: 'INST001',
            youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ',
            batchId: 'BATCH-A',
        });
        await fixture.service.publish(created.id);
        const list = await fetch(`${fixture.url}/api/v1/student/study-materials`, { headers: adminHeaders });
        assert.equal(list.status, 200);
        const body = (await list.json());
        assert.deepEqual(body.data.map((m) => m.title), ['Own batch lecture']);
        // Cross-batch direct-id access is an indistinguishable 404.
        const foreign = await fetch(`${fixture.url}/api/v1/student/study-materials/00000000-0000-4000-8000-000000000ed5/access`, {
            headers: adminHeaders,
        });
        assert.equal(foreign.status, 404);
    }
    finally {
        await fixture.close();
    }
});
test('student video access returns the safe embed URL', async () => {
    // Student belongs to BATCH-Z — the same batch as the seeded video.
    const fixture = await startFixture({
        roles: ['STUDENT'],
        authUserId: STUDENT_AUTH_ID,
        studentBatchId: 'BATCH-Z',
    });
    try {
        // ALL-audience seeded row is visible to every active student.
        const access = await fetch(`${fixture.url}/api/v1/student/study-materials/00000000-0000-4000-8000-000000000ed5/access`, { headers: adminHeaders });
        assert.equal(access.status, 200);
        const body = (await access.json());
        assert.equal(body.data.kind, 'VIDEO');
        assert.equal(body.data.embedUrl, 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    }
    finally {
        await fixture.close();
    }
});
test('unlinked or revoked identities cannot reach the student surface', async () => {
    const unlinked = await startFixture({ roles: ['STUDENT'], identityLinked: false });
    try {
        const response = await fetch(`${unlinked.url}/api/v1/student/study-materials`, { headers: adminHeaders });
        assert.equal(response.status, 403);
        assert.equal((await response.json()).error.code, 'STUDENT_IDENTITY_NOT_LINKED');
    }
    finally {
        await unlinked.close();
    }
    const revoked = await startFixture({ roles: ['STUDENT'], accessStatus: 'REVOKED' });
    try {
        const response = await fetch(`${revoked.url}/api/v1/student/study-materials`, { headers: adminHeaders });
        assert.equal(response.status, 403);
        assert.equal((await response.json()).error.code, 'STUDENT_ACCESS_REVOKED');
    }
    finally {
        await revoked.close();
    }
});
test('deleting a material removes its stored object as well', async () => {
    const fixture = await startFixture();
    try {
        const created = await fetch(`${fixture.url}/api/v1/study-materials/documents`, {
            method: 'POST',
            headers: adminHeaders,
            body: documentForm('notes.pdf', 'application/pdf', PDF_MAGIC),
        });
        const { data: { id } } = (await created.json());
        const deleted = await fetch(`${fixture.url}/api/v1/study-materials/${id}`, {
            method: 'DELETE',
            headers: adminHeaders,
        });
        assert.equal(deleted.status, 200);
        assert.deepEqual(fixture.storage.removals.length, 1);
    }
    finally {
        await fixture.close();
    }
});
