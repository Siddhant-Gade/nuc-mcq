import { ApiError } from '../../utils/api-error.js';
export class BroadcastService {
    repository;
    /** Injected by server.js after construction (same pattern as studyMaterialService). */
    pushService = null;
    constructor(repository) {
        this.repository = repository;
    }
    async list() {
        return this.repository.list();
    }
    /** PUBLISHED broadcasts visible to the resolved student's batch with persistent read status. */
    async listForStudent(batchId, authUserId) {
        return this.repository.listPublishedForStudent(batchId, authUserId);
    }
    async markRead(id, authUserId) {
        const broadcast = await this.getById(id);
        if (broadcast.status !== 'PUBLISHED') {
            throw notFound(id);
        }
        if (typeof this.repository.markRead === 'function') {
            return this.repository.markRead(id, authUserId);
        }
        return { broadcastId: id, isRead: true, readAt: new Date().toISOString() };
    }
    async markAllRead(batchId, authUserId) {
        if (typeof this.repository.markAllRead === 'function') {
            return this.repository.markAllRead(batchId, authUserId);
        }
        return { updatedCount: 0 };
    }
    async unreadCount(batchId, authUserId) {
        if (typeof this.repository.countUnread === 'function') {
            return this.repository.countUnread(batchId, authUserId);
        }
        const broadcasts = await this.listForStudent(batchId, authUserId);
        return broadcasts.filter((b) => !b.isRead).length;
    }
    async getById(id) {
        const broadcast = await this.repository.getById(id);
        if (broadcast === undefined) {
            throw notFound(id);
        }
        return broadcast;
    }
    async create(createdByAuthUserId, input) {
        const targetBatchIds = normalizeTargets(input.audienceType, input.targetBatchIds);
        this.assertTargetsPresent(input.audienceType, targetBatchIds);
        await this.assertBatchesExist(targetBatchIds);
        return this.repository.insert({
            title: input.title,
            message: input.message,
            audienceType: input.audienceType,
            status: 'DRAFT',
            publishedAt: null,
            // The admin identity comes exclusively from the verified JWT.
            createdBy: createdByAuthUserId,
        }, targetBatchIds);
    }
    /**
     * Edits title/message/audience/targets. Confirmed Phase 12 rule: published
     * broadcasts remain editable; publishing stays one-way and is a separate
     * explicit transition.
     */
    async update(id, input) {
        if (Object.keys(input).length === 0) {
            throw new ApiError(400, 'VALIDATION_ERROR', 'Provide at least one field to update.');
        }
        const existing = await this.getById(id);
        const fields = {};
        if (input.title !== undefined) {
            fields.title = input.title;
        }
        if (input.message !== undefined) {
            fields.message = input.message;
        }
        let replacementTargetBatchIds = null;
        if (input.audienceType !== undefined || input.targetBatchIds !== undefined) {
            const effectiveAudience = input.audienceType ?? existing.audienceType;
            const effectiveTargets = effectiveAudience === 'ALL'
                ? []
                : normalizeTargets('BATCH', input.targetBatchIds ?? existing.targetBatchIds);
            if (effectiveAudience !== existing.audienceType) {
                fields.audienceType = effectiveAudience;
            }
            replacementTargetBatchIds = effectiveTargets;
            this.assertTargetsPresent(effectiveAudience, effectiveTargets);
            await this.assertBatchesExist(effectiveTargets);
        }
        const updated = await this.repository.update(id, fields, replacementTargetBatchIds);
        if (updated === undefined) {
            throw notFound(id);
        }
        return updated;
    }
    async publish(id) {
        const existing = await this.repository.getById(id);
        if (existing === undefined) {
            throw notFound(id);
        }
        if (existing.status === 'PUBLISHED') {
            throw new ApiError(409, 'CONFLICT', `Broadcast ${id} is already published.`);
        }
        const publishedAt = await this.repository.markPublished(id);
        if (publishedAt === undefined) {
            // A concurrent request won the transition race between the read above
            // and the guarded update — treat it the same as an explicit re-publish.
            throw new ApiError(409, 'CONFLICT', `Broadcast ${id} is already published.`);
        }
        const published = { ...existing, status: 'PUBLISHED', publishedAt };
        // Fire push notification to all students (non-blocking — never fail the publish).
        if (this.pushService) {
            if (existing.audienceType === 'ALL') {
                this.pushService
                    .sendPush({ targetType: 'ALL', title: existing.title, body: existing.message, type: 'BROADCAST', actionRoute: '/broadcasts' })
                    .catch((err) => { console.error('[BroadcastService] Push failed (non-fatal):', err?.message ?? err); });
            } else if (existing.audienceType === 'BATCH' && Array.isArray(existing.targetBatchIds)) {
                for (const batchId of existing.targetBatchIds) {
                    this.pushService
                        .sendPush({ targetType: 'BATCH', targetBatchId: batchId, title: existing.title, body: existing.message, type: 'BROADCAST', actionRoute: '/broadcasts' })
                        .catch((err) => { console.error('[BroadcastService] Push failed for batch', batchId, '(non-fatal):', err?.message ?? err); });
                }
            }
        }
        return published;
    }
    /** Confirmed hard-delete policy: no archive step. */
    async remove(id) {
        const deleted = await this.repository.removeById(id);
        if (!deleted) {
            throw notFound(id);
        }
    }
    assertTargetsPresent(audienceType, targetBatchIds) {
        if (audienceType === 'BATCH' && targetBatchIds.length === 0) {
            throw new ApiError(400, 'VALIDATION_ERROR', 'At least one target batch is required for a batch-audience broadcast.');
        }
    }
    async assertBatchesExist(targetBatchIds) {
        if (targetBatchIds.length === 0) {
            return;
        }
        const existing = await this.repository.findExistingBatchIds(targetBatchIds);
        const unknown = targetBatchIds.filter((batchId) => !existing.includes(batchId));
        if (unknown.length > 0) {
            throw new ApiError(400, 'VALIDATION_ERROR', `Unknown batch IDs: ${unknown.join(', ')}.`);
        }
    }
}
const normalizeTargets = (audienceType, targetBatchIds) => {
    if (audienceType === 'ALL') {
        return [];
    }
    const targets = targetBatchIds ?? [];
    return [...new Set(targets)];
};
const notFound = (id) => new ApiError(404, 'NOT_FOUND', `No broadcast with id ${id} was found.`);
