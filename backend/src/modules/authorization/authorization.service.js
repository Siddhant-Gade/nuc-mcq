import { ApiError } from '../../utils/api-error.js';
export class AuthorizationRequestService {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async list(status) {
        return status === undefined ? this.repository.list() : this.repository.listByStatus(status);
    }
    async getById(id) {
        if (typeof this.repository.findViewById === 'function') {
            const record = await this.repository.findViewById(id);
            if (record === undefined) {
                throw new ApiError(404, 'NOT_FOUND', 'Authorization request not found.');
            }
            return record;
        }
        const records = await this.repository.list();
        const record = records.find((candidate) => candidate.id === id);
        if (record === undefined) {
            throw new ApiError(404, 'NOT_FOUND', 'Authorization request not found.');
        }
        return record;
    }
    /**
     * Confirmed workflow (SYSTEM_DESIGN.md §17): approving a PENDING request
     * marks it APPROVED, stamps server-derived reviewer identity, and activates
     * the student's access with the linked auth identity in one transaction.
     */
    async approve(id, reviewerAuthUserId) {
        const outcome = await this.repository.approve(id, reviewerAuthUserId);
        if (outcome === undefined) {
            const exists = await this.repository.findById(id);
            if (exists === undefined) {
                throw new ApiError(404, 'NOT_FOUND', 'Authorization request not found.');
            }
            throw new ApiError(409, 'CONFLICT', `Authorization request has already been ${exists.status.toLowerCase()}.`);
        }

        // Invalidate identity cache so the student's next /auth/me sees ACTIVE immediately
        if (this.invalidateIdentityCache && outcome.record.authUserId) {
            this.invalidateIdentityCache(outcome.record.authUserId);
        }

        // Fire-and-forget push — don't block HTTP response
        if (this.pushService && outcome.record.authUserId) {
            this.pushService.sendPush({
                targetType: 'INDIVIDUAL',
                targetAuthUserIds: [outcome.record.authUserId],
                title: 'Account Authorized! 🎉',
                body: 'Your admission has been approved by the institute. Tap to log in.',
                type: 'AUTHORIZATION',
                actionRoute: '/login',
            }).catch(err => console.error('[FCM] Push dispatch error on approve:', err.message));
        }

        return this.getById(outcome.record.id);
    }
    /** Rejection revokes the student's access record. */
    async reject(id, reviewerAuthUserId) {
        const updated = await this.repository.reject(id, reviewerAuthUserId);
        if (updated === undefined) {
            const exists = await this.repository.findById(id);
            if (exists === undefined) {
                throw new ApiError(404, 'NOT_FOUND', 'Authorization request not found.');
            }
            throw new ApiError(409, 'CONFLICT', `Authorization request has already been ${exists.status.toLowerCase()}.`);
        }

        // Invalidate identity cache
        if (this.invalidateIdentityCache && updated.authUserId) {
            this.invalidateIdentityCache(updated.authUserId);
        }

        // Fire-and-forget rejection push notification
        if (this.pushService && updated.authUserId) {
            this.pushService.sendPush({
                targetType: 'INDIVIDUAL',
                targetAuthUserIds: [updated.authUserId],
                title: 'Access Request Update',
                body: 'Your access request has been reviewed. Please contact your institute for more details.',
                type: 'AUTHORIZATION',
                actionRoute: '/login',
            }).catch(err => console.error('[FCM] Push dispatch error on reject:', err.message));
        }

        return this.getById(updated.id);
    }
    /**
     * Phase 10 — confirmed first-login flow (SYSTEM_DESIGN.md §17): a student
     * whose identity is unlinked or not yet ACTIVE may create exactly one
     * PENDING request for themselves. Identity comes from the resolved token,
     * never the body.
     */
    async createForCurrentStudent(input) {
        if (input.accessStatus === 'ACTIVE') {
            throw new ApiError(409, 'CONFLICT', 'Student access is already active; no authorization request is needed.');
        }
        const existingPending = await this.repository.findPendingByAuthUserId(input.authUserId);
        if (existingPending !== undefined) {
            throw new ApiError(409, 'CONFLICT', 'An authorization request is already pending review.');
        }
        if (typeof this.repository.findPendingByStudentProfileId === 'function') {
            const existingByProfile = await this.repository.findPendingByStudentProfileId(input.studentProfileId);
            if (existingByProfile !== undefined) {
                if (existingByProfile.authUserId !== input.authUserId && typeof this.repository.updateAuthUserId === 'function') {
                    await this.repository.updateAuthUserId(existingByProfile.id, input.authUserId);
                }
                return this.getById(existingByProfile.id);
            }
        }
        const record = await this.repository.create(input.studentProfileId, input.authUserId);
        const created = await this.getById(record.id);
        if (created === undefined) {
            throw new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Authorization request was created but could not be read back.');
        }
        return created;
    }
    async ensureExists(id) {
        const record = await this.repository.findById(id);
        if (record === undefined) {
            throw new ApiError(404, 'NOT_FOUND', 'Authorization request not found.');
        }
        return record;
    }
    async ensurePending(idOrRecord) {
        const record = typeof idOrRecord === 'string' ? await this.ensureExists(idOrRecord) : idOrRecord;
        if (record.status !== 'PENDING') {
            throw new ApiError(409, 'CONFLICT', `Authorization request has already been ${record.status.toLowerCase()}.`);
        }
    }
}
