import { randomUUID } from 'node:crypto';
import { ApiError } from '../../utils/api-error.js';
import { MAX_DOCUMENT_BYTES, SIGNED_URL_EXPIRY_SECONDS, createSignedDownloadUrl, removeDocument, uploadDocument, } from '../../utils/storage.js';
import { buildYoutubeEmbedUrl, detectDocumentType, isAllowedContentType, parseYoutubeVideoId } from './study-material.content.js';
export const supabaseStudyMaterialStorage = {
    uploadDocument: (materialId, instituteId, fileName, buffer, contentType) => uploadDocument(materialId, instituteId, fileName, buffer, contentType),
    createSignedDownloadUrl: (filePath) => createSignedDownloadUrl(filePath),
    removeDocument: (filePath) => removeDocument(filePath),
};
const notFound = (id) => new ApiError(404, 'NOT_FOUND', `No study material with id ${id} was found.`);
export class StudyMaterialService {
    repository;
    storage;
    notificationService;
    constructor(repository, storage, notificationService = null) {
        this.repository = repository;
        this.storage = storage;
        this.notificationService = notificationService;
    }
    /** Client-safe projection: internal storage path never leaves the API. */
    toView(record) {
        const { filePath, ...rest } = record;
        void filePath;
        return {
            ...rest,
            embedUrl: record.youtubeVideoId === null ? null : buildYoutubeEmbedUrl(record.youtubeVideoId),
        };
    }
    async list() {
        return (await this.repository.list()).map((record) => this.toView(record));
    }
    async getById(id) {
        const record = await this.repository.getById(id);
        if (record === undefined) {
            throw notFound(id);
        }
        return this.toView(record);
    }
    /**
     * Confirmed Phase 13 visibility rule, re-checked server-side on every read:
     * PUBLISHED materials only, targeted either to all students or to the
     * caller's own batch. Foreign-batch ids are indistinguishable 404s.
     */
    assertVisibleToStudent(record, studentBatchId) {
        const visible = record.status === 'PUBLISHED' && (record.batchId === null || record.batchId === studentBatchId);
        if (!visible) {
            throw notFound(record.id);
        }
    }
    async listForStudent(studentBatchId) {
        return (await this.repository.listPublishedForStudent(studentBatchId)).map((record) => this.toView(record));
    }
    async getForStudent(id, studentBatchId) {
        const record = await this.repository.getById(id);
        if (record === undefined) {
            throw notFound(id);
        }
        this.assertVisibleToStudent(record, studentBatchId);
        return this.toView(record);
    }
    async getStudentAccess(id, studentBatchId) {
        const record = await this.repository.getById(id);
        if (record === undefined) {
            throw notFound(id);
        }
        this.assertVisibleToStudent(record, studentBatchId);
        if (record.kind === 'VIDEO') {
            return { kind: 'VIDEO', embedUrl: buildYoutubeEmbedUrl(record.youtubeVideoId ?? ''), view: this.toView(record) };
        }
        // Documents require configured storage even though the metadata read does not.
        const filePath = record.filePath ?? '';
        const signedUrl = await this.storage.createSignedDownloadUrl(filePath);
        return {
            kind: 'DOCUMENT',
            fileName: record.fileName ?? 'document',
            signedUrl,
            expiresInSeconds: SIGNED_URL_EXPIRY_SECONDS,
            view: this.toView(record),
        };
    }
    async assertBatchExists(batchId) {
        if (typeof batchId !== 'string' || batchId.length === 0) {
            return;
        }
        if (!(await this.repository.batchExists(batchId))) {
            throw new ApiError(400, 'VALIDATION_ERROR', `Unknown batch ID: ${batchId}.`);
        }
    }
    async createDocument(adminAuthUserId, input) {
        await this.assertBatchExists(input.batchId ?? null);
        if (input.fileBuffer.length > MAX_DOCUMENT_BYTES) {
            throw new ApiError(400, 'VALIDATION_ERROR', 'Document exceeds the 5 MB limit.');
        }
        if (input.fileBuffer.length === 0) {
            throw new ApiError(400, 'VALIDATION_ERROR', 'The uploaded document is empty.');
        }
        if (!isAllowedContentType(input.contentType)) {
            throw new ApiError(400, 'VALIDATION_ERROR', 'Unsupported document type. Only PDF, DOC, DOCX, PPT, and PPTX are allowed.');
        }
        // Magic-byte sniffing: client-supplied MIME/extension alone are not trusted.
        const documentType = detectDocumentType(input.fileName, input.fileBuffer);
        if (documentType === null) {
            throw new ApiError(400, 'VALIDATION_ERROR', 'Unsupported document type. Only PDF, DOC, DOCX, PPT, and PPTX are allowed.');
        }
        const materialId = randomUUID();
        const stored = await this.storage.uploadDocument(materialId, input.instituteId, input.fileName, input.fileBuffer, input.contentType);
        try {
            const inserted = await this.repository.insert({
                id: materialId,
                instituteId: input.instituteId,
                title: input.title,
                description: input.description ?? null,
                kind: 'DOCUMENT',
                status: 'DRAFT',
                filePath: stored.path,
                fileName: input.fileName,
                fileSize: input.fileBuffer.length,
                documentType,
                youtubeVideoId: null,
                batchId: input.batchId ?? null,
                uploadedBy: adminAuthUserId,
                publishedAt: null,
            });
            return this.toView(inserted);
        }
        catch (error) {
            // Row write failed after upload — do not leave an orphan object behind.
            await this.storage.removeDocument(stored.path).catch(() => undefined);
            throw error;
        }
    }
    async createVideo(adminAuthUserId, input) {
        await this.assertBatchExists(input.batchId ?? null);
        const youtubeVideoId = parseYoutubeVideoId(input.youtubeUrl);
        if (youtubeVideoId === null) {
            throw new ApiError(400, 'VALIDATION_ERROR', 'Provide a valid YouTube video URL.');
        }
        const inserted = await this.repository.insert({
            id: randomUUID(),
            instituteId: input.instituteId,
            title: input.title,
            description: input.description ?? null,
            kind: 'VIDEO',
            status: 'DRAFT',
            filePath: null,
            fileName: null,
            fileSize: null,
            documentType: null,
            youtubeVideoId,
            batchId: input.batchId ?? null,
            uploadedBy: adminAuthUserId,
            publishedAt: null,
        });
        return this.toView(inserted);
    }
    /**
     * Metadata/targeting edits. Status changes here allow unpublishing
     * (PUBLISHED → DRAFT clears the stamp); use {@link publish} for the
     * guarded one-way transition.
     */
    async update(id, input) {
        const existing = await this.repository.getById(id);
        if (existing === undefined) {
            throw notFound(id);
        }
        if (input.batchId !== undefined && input.batchId !== null && input.batchId.length > 0) {
            await this.assertBatchExists(input.batchId);
        }
        const updated = await this.repository.update(id, {
            ...(input.title !== undefined ? { title: input.title } : {}),
            ...(input.description !== undefined ? { description: input.description } : {}),
            ...(input.status !== undefined ? { status: input.status } : {}),
            ...(input.batchId !== undefined ? { batchId: input.batchId === null ? null : input.batchId } : {}),
        });
        if (updated === undefined) {
            throw notFound(id);
        }
        return this.toView(updated);
    }
    async publish(id) {
        const existing = await this.repository.getById(id);
        if (existing === undefined) {
            throw notFound(id);
        }
        if (existing.status === 'PUBLISHED') {
            throw new ApiError(409, 'CONFLICT', `Study material ${id} is already published.`);
        }
        const publishedAt = await this.repository.markPublished(id);
        if (publishedAt === undefined) {
            throw new ApiError(409, 'CONFLICT', `Study material ${id} is already published.`);
        }
        if (this.notificationService && typeof this.repository.getTargetStudentAuthUserIds === 'function') {
            try {
                const recipientIds = await this.repository.getTargetStudentAuthUserIds(existing.batchId);
                const title = `New Study Material: ${existing.title}`;
                const message = existing.description && existing.description.trim().length > 0
                    ? existing.description
                    : `New study material has been added to your notes.`;
                await Promise.allSettled(recipientIds.map((recipientAuthUserId) => {
                    return this.notificationService.create({
                        recipientAuthUserId,
                        title,
                        message,
                        type: 'study_material',
                        relatedRoute: '/notes',
                    });
                }));

                // Dispatch FCM push notification
                if (this.pushService) {
                    await this.pushService.sendPush({
                        targetType: existing.batchId ? 'BATCH' : 'ALL',
                        targetBatchId: existing.batchId,
                        targetAuthUserIds: recipientIds,
                        title,
                        body: message,
                        type: 'STUDY_MATERIAL',
                        materialId: existing.id,
                        actionRoute: '/notes',
                    }).catch((err) => console.error('[FCM] Error sending study material push:', err.message));
                }
            } catch (notifyErr) {
                console.error('[StudyMaterialService] Failed to dispatch notifications:', notifyErr);
            }
        }
        return this.toView({ ...existing, status: 'PUBLISHED', publishedAt });
    }
    async remove(id) {
        const existing = await this.repository.getById(id);
        if (existing === undefined) {
            throw notFound(id);
        }
        await this.repository.removeById(id);
        if (existing.kind === 'DOCUMENT' && existing.filePath !== null) {
            try {
                await this.storage.removeDocument(existing.filePath);
            }
            catch (error) {
                // Unconfigured storage must not block metadata cleanup (tests/dev).
                if (!(error instanceof ApiError && error.code === 'STORAGE_NOT_CONFIGURED')) {
                    throw error;
                }
            }
        }
    }
}
