import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError } from '../../utils/api-error.js';
import { MAX_DOCUMENT_BYTES } from '../../utils/storage.js';
import { StudyMaterialService } from './study-material.service.js';
const ADMIN_ID = '00000000-0000-4000-8000-00000000a001';
const PDF_MAGIC = Buffer.from('%PDF-1.4\n');
const OLE2_MAGIC = Buffer.from([0xd0, 0xcf, 0x11, 0xe0]);
const ZIP_MAGIC = Buffer.concat([Buffer.from([0x50, 0x4b]), Buffer.alloc(16)]);
class FakeStudyMaterialRepository {
    rows = [];
    sequence = 0;
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
    knownBatches = new Set(['BATCH-A']);
    async batchExists(batchId) {
        return this.knownBatches.has(batchId);
    }
    async insert(record) {
        this.sequence += 1;
        const inserted = {
            ...record,
            publishedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.rows.push(inserted);
        return inserted;
    }
    async update(id, fields) {
        const row = this.rows.find((candidate) => candidate.id === id);
        if (row === undefined) {
            return undefined;
        }
        Object.assign(row, fields, { updatedAt: new Date() });
        if (fields.status === 'PUBLISHED') {
            row.publishedAt = new Date();
        }
        if (fields.status === 'DRAFT') {
            row.publishedAt = null;
        }
        return { ...row };
    }
    async markPublished(id) {
        const row = this.rows.find((candidate) => candidate.id === id);
        if (row === undefined || row.status !== 'DRAFT') {
            return undefined;
        }
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
class FakeStorage {
    uploads = [];
    removals = [];
    signedCalls = [];
    async uploadDocument(materialId, instituteId, fileName) {
        const path = `${instituteId}/${materialId}/${fileName}`;
        this.uploads.push({ path });
        return { path };
    }
    async createSignedDownloadUrl(filePath) {
        this.signedCalls.push(filePath);
        return `https://signed.example/${filePath}?token=abc`;
    }
    async removeDocument(filePath) {
        this.removals.push(filePath);
    }
}
const serviceWith = () => {
    const repository = new FakeStudyMaterialRepository();
    const storage = new FakeStorage();
    return { repository, storage, service: new StudyMaterialService(repository, storage) };
};
const baseDocument = {
    title: 'Unit notes',
    instituteId: 'INST001',
    fileName: 'notes.pdf',
    contentType: 'application/pdf',
};
test('a genuine PDF uploads to storage and lands as an all-students DRAFT', async () => {
    const { storage, service } = serviceWith();
    const view = await service.createDocument(ADMIN_ID, { ...baseDocument, fileBuffer: PDF_MAGIC });
    assert.equal(view.kind, 'DOCUMENT');
    assert.equal(view.status, 'DRAFT');
    assert.equal(view.documentType, 'PDF');
    assert.equal('filePath' in view, false); // internal path is never exposed
    assert.equal(storage.uploads.length, 1);
    assert.match(storage.uploads[0]?.path ?? '', /^INST001\/[0-9a-f-]+\/notes\.pdf$/);
});
test('DOC and DOCX variants are accepted via magic-byte sniffing', async () => {
    const { service } = serviceWith();
    const doc = await service.createDocument(ADMIN_ID, {
        ...baseDocument,
        fileName: 'legacy.doc',
        contentType: 'application/msword',
        fileBuffer: OLE2_MAGIC,
    });
    assert.equal(doc.documentType, 'DOC');
    const docx = await service.createDocument(ADMIN_ID, {
        ...baseDocument,
        fileName: 'modern.docx',
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileBuffer: ZIP_MAGIC,
    });
    assert.equal(docx.documentType, 'DOCX');
    const ppt = await service.createDocument(ADMIN_ID, {
        ...baseDocument,
        fileName: 'presentation.ppt',
        contentType: 'application/vnd.ms-powerpoint',
        fileBuffer: OLE2_MAGIC,
    });
    assert.equal(ppt.documentType, 'PPT');
    const pptx = await service.createDocument(ADMIN_ID, {
        ...baseDocument,
        fileName: 'deck.pptx',
        contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        fileBuffer: ZIP_MAGIC,
    });
    assert.equal(pptx.documentType, 'PPTX');
});
test('content that does not match its declared type is rejected', async () => {
    const { storage, service } = serviceWith();
    await assert.rejects(service.createDocument(ADMIN_ID, { ...baseDocument, fileBuffer: Buffer.from('hello world') }), (error) => error instanceof ApiError && error.statusCode === 400);
    assert.equal(storage.uploads.length, 0);
});
test('oversized and empty documents are rejected before any write', async () => {
    const { storage, service } = serviceWith();
    await assert.rejects(service.createDocument(ADMIN_ID, { ...baseDocument, fileBuffer: Buffer.concat([PDF_MAGIC, Buffer.alloc(MAX_DOCUMENT_BYTES)]) }), (error) => error instanceof ApiError && error.message.includes('5 MB'));
    await assert.rejects(service.createDocument(ADMIN_ID, { ...baseDocument, fileBuffer: Buffer.alloc(0) }), (error) => error instanceof ApiError && error.statusCode === 400);
    assert.equal(storage.uploads.length, 0);
});
test('an unknown target batch is rejected for documents and videos alike', async () => {
    const { service } = serviceWith();
    await assert.rejects(service.createDocument(ADMIN_ID, { ...baseDocument, fileBuffer: PDF_MAGIC, batchId: 'GHOST' }), (error) => error instanceof ApiError && /GHOST/.test(error.message));
    await assert.rejects(service.createVideo(ADMIN_ID, {
        title: 'Lecture',
        instituteId: 'INST001',
        youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        batchId: 'GHOST',
    }), (error) => error instanceof ApiError && /GHOST/.test(error.message));
});
test('a valid YouTube URL stores only the video id and exposes a safe embed URL', async () => {
    const { service } = serviceWith();
    for (const url of [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ',
        'https://www.youtube.com/shorts/dQw4w9WgXcQ',
        'http://m.youtube.com/embed/dQw4w9WgXcQ',
    ]) {
        const view = await service.createVideo(ADMIN_ID, {
            title: 'Lecture',
            instituteId: 'INST001',
            youtubeUrl: url,
        });
        assert.equal(view.youtubeVideoId, 'dQw4w9WgXcQ');
        assert.equal(view.embedUrl, 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    }
});
test('non-YouTube or malformed URLs are rejected', async () => {
    const { repository, service } = serviceWith();
    for (const url of [
        'https://vimeo.com/148751763',
        'https://evil.example/watch?v=dQw4w9WgXcQ',
        'https://www.youtube.com/watch?v=shortid',
        '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>',
        'not-a-url',
    ]) {
        await assert.rejects(service.createVideo(ADMIN_ID, { title: 'Lecture', instituteId: 'INST001', youtubeUrl: url }), (error) => error instanceof ApiError && error.statusCode === 400);
    }
    assert.equal(repository.rows.length, 0);
});
test('publishing is guarded and unpublishing via update clears the stamp', async () => {
    const { service } = serviceWith();
    const created = await service.createVideo(ADMIN_ID, {
        title: 'Lecture',
        instituteId: 'INST001',
        youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ',
    });
    const published = await service.publish(created.id);
    assert.equal(published.status, 'PUBLISHED');
    await assert.rejects(service.publish(created.id), (error) => error instanceof ApiError && error.statusCode === 409);
    const unpublished = await service.update(created.id, { status: 'DRAFT' });
    assert.equal(unpublished.status, 'DRAFT');
    assert.equal(unpublished.publishedAt, null);
});
test('deletion removes the metadata row and the stored object', async () => {
    const { storage, service } = serviceWith();
    const created = await service.createDocument(ADMIN_ID, { ...baseDocument, fileBuffer: PDF_MAGIC });
    await service.remove(created.id);
    assert.equal(await service.getById(created.id).then(() => true).catch(() => false), false);
    assert.deepEqual(storage.removals.map((path) => path.endsWith('/notes.pdf')), [true]);
    await assert.rejects(service.remove(created.id), (error) => error instanceof ApiError && error.statusCode === 404);
});
const seedVisibleRow = async (service, overrides) => {
    const created = await service.createVideo(ADMIN_ID, {
        title: overrides.title ?? 'Lecture',
        instituteId: 'INST001',
        youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ',
        ...(overrides.batchId !== undefined ? { batchId: overrides.batchId } : {}),
    });
    if (overrides.status === 'PUBLISHED') {
        await service.publish(created.id);
    }
};
test('student visibility: only PUBLISHED rows for ALL or own batch pass the check', async () => {
    const { repository, service } = serviceWith();
    repository.knownBatches.add('BATCH-B');
    await seedVisibleRow(service, { title: 'all-published', status: 'PUBLISHED' });
    await seedVisibleRow(service, { title: 'own-batch-published', status: 'PUBLISHED', batchId: 'BATCH-A' });
    await seedVisibleRow(service, { title: 'other-batch-published', status: 'PUBLISHED', batchId: 'BATCH-B' });
    await seedVisibleRow(service, { title: 'own-batch-draft', batchId: 'BATCH-A' });
    const visible = await service.listForStudent('BATCH-A');
    assert.deepEqual(visible.map((view) => view.title).sort(), ['all-published', 'own-batch-published']);
    // Direct-id access to another batch's material is an indistinguishable 404.
    const otherBatch = (await service.list()).find((row) => row.title === 'other-batch-published');
    assert.ok(otherBatch);
    await assert.rejects(service.getForStudent(otherBatch.id, 'BATCH-A'), (error) => error instanceof ApiError && error.statusCode === 404);
    const draft = (await service.list()).find((row) => row.title === 'own-batch-draft');
    assert.ok(draft);
    await assert.rejects(service.getForStudent(draft.id, 'BATCH-A'));
});
test('student access returns a signed URL for documents and an embed URL for videos', async () => {
    const { storage, service } = serviceWith();
    const document = await service.createDocument(ADMIN_ID, { ...baseDocument, fileBuffer: PDF_MAGIC, batchId: 'BATCH-A' });
    await service.update(document.id, { status: 'PUBLISHED' });
    const video = await service.createVideo(ADMIN_ID, {
        title: 'Lecture',
        instituteId: 'INST001',
        youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ',
    });
    await service.publish(video.id);
    const docAccess = await service.getStudentAccess(document.id, 'BATCH-A');
    assert.equal(docAccess.kind, 'DOCUMENT');
    if (docAccess.kind === 'DOCUMENT') {
        assert.equal(storage.signedCalls.length, 1);
        assert.ok(docAccess.signedUrl.includes('/INST001/'));
        assert.equal(docAccess.expiresInSeconds, 60);
    }
    const videoAccess = await service.getStudentAccess(video.id, 'BATCH-A');
    assert.equal(videoAccess.kind, 'VIDEO');
    if (videoAccess.kind === 'VIDEO') {
        assert.equal(videoAccess.embedUrl, 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    }
});
