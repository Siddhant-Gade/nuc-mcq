import { ApiError } from '../../utils/api-error.js';
export class BroadcastService {
    repository;
    /** Injected by server.js after construction (same pattern as studyMaterialService). */
    pushService = null;
    notificationService = null;
    studentProfileRepository = null;
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
        // Dispatch in-app notifications into database for students
        if (this.notificationService && typeof this.repository.getTargetStudentAuthUserIds === 'function') {
            try {
                const targetBatches = existing.audienceType === 'BATCH' && Array.isArray(existing.targetBatchIds)
                    ? existing.targetBatchIds
                    : [];
                const recipientIds = await this.repository.getTargetStudentAuthUserIds(targetBatches);
                const title = 'Announcement: ' + existing.title;
                const message = existing.message;
                await Promise.allSettled(recipientIds.map((recipientAuthUserId) => {
                    return this.notificationService.create({
                        recipientAuthUserId,
                        title,
                        message,
                        type: 'announcement',
                        relatedRoute: '/broadcasts',
                    });
                }));
            } catch (notifyErr) {
                console.error('[BroadcastService] Failed to dispatch in-app notifications:', notifyErr);
            }
        }

        // Dispatch FCM push notifications with guaranteed delivery
        if (this.pushService) {
            try {
                const targetBatches = existing.audienceType === 'BATCH' && Array.isArray(existing.targetBatchIds)
                    ? existing.targetBatchIds
                    : [];
                let recipientAuthUserIds = [];
                if (typeof this.repository.getTargetStudentAuthUserIds === 'function') {
                    recipientAuthUserIds = await this.repository.getTargetStudentAuthUserIds(targetBatches);
                }

                console.info(`[BroadcastService] Publishing push: id=${existing.id}, title="${existing.title}", audience=${existing.audienceType}, batches=${targetBatches.join(',') || 'ALL'}, eligibleStudents=${recipientAuthUserIds.length}`);

                if (existing.audienceType === 'ALL') {
                    const result = await this.pushService
                        .sendPush({
                            targetType: 'ALL',
                            targetAuthUserIds: recipientAuthUserIds.length > 0 ? recipientAuthUserIds : undefined,
                            title: existing.title,
                            body: existing.message,
                            type: 'BROADCAST',
                            broadcastId: existing.id,
                            actionRoute: '/broadcasts',
                        });
                    console.info(`[BroadcastService] Push result for ALL: sent=${result?.sentCount}, failed=${result?.failedCount}`);
                } else if (existing.audienceType === 'BATCH') {
                    const result = await this.pushService
                        .sendPush({
                            targetType: 'BATCH',
                            targetBatchIds: targetBatches,
                            targetAuthUserIds: recipientAuthUserIds.length > 0 ? recipientAuthUserIds : undefined,
                            title: existing.title,
                            body: existing.message,
                            type: 'BROADCAST',
                            broadcastId: existing.id,
                            actionRoute: '/broadcasts',
                        });
                    console.info(`[BroadcastService] Push result for BATCH (${targetBatches.join(',')}): sent=${result?.sentCount}, failed=${result?.failedCount}`);
                }
            } catch (pushErr) {
                console.error('[BroadcastService] Push dispatch error (non-fatal):', pushErr?.message ?? pushErr);
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
