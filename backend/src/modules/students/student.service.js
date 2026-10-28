import { ApiError } from '../../utils/api-error.js';
import { isUniqueViolation } from '../../utils/db-errors.js';
const allowedStatusTransitions = {
    PENDING: ['ACTIVE'],
    ACTIVE: ['EXPIRED', 'REVOKED'],
    EXPIRED: [],
    REVOKED: ['PENDING', 'ACTIVE'],
};
export class StudentService {
    repository;
    notificationService = null;
    pushService = null;
    invalidateIdentityCache = null;
    supportEmail = null;
    constructor(repository) {
        this.repository = repository;
    }
    async list() {
        return this.repository.list();
    }
    async getById(id) {
        const student = await this.repository.findById(id);
        if (student === undefined) {
            throw new ApiError(404, 'NOT_FOUND', 'Student not found.');
        }
        return student;
    }
    async getAccessByStudentId(studentProfileId) {
        await this.getById(studentProfileId);
        const access = await this.repository.findAccessByStudentId(studentProfileId);
        if (access === undefined) {
            throw new ApiError(404, 'NOT_FOUND', 'Student access record not found.');
        }
        return access;
    }
    async create(input) {
        try {
            return await this.repository.create(input);
        }
        catch (error) {
            if (isUniqueViolation(error)) {
                throw new ApiError(409, 'CONFLICT', 'A student with this Student ID already exists.');
            }
            throw error;
        }
    }
    async update(id, input) {
        try {
            const student = await this.repository.update(id, input);
            if (student === undefined) {
                throw new ApiError(404, 'NOT_FOUND', 'Student not found.');
            }
            return student;
        }
        catch (error) {
            if (isUniqueViolation(error)) {
                throw new ApiError(409, 'CONFLICT', 'A student with this Student ID or Email already exists.');
            }
            throw error;
        }
    }
    async updateAccessStatus(id, targetStatus, reviewerAuthUserId) {
        const currentAccess = await this.getAccessByStudentId(id);
        if (!allowedStatusTransitions[currentAccess.status].includes(targetStatus)) {
            throw new ApiError(422, 'BUSINESS_RULE_ERROR', `Student access cannot transition from ${currentAccess.status} to ${targetStatus}.`);
        }
        const updatedAccess = await this.repository.updateAccessStatus(id, targetStatus);
        if (updatedAccess === undefined) {
            throw new ApiError(404, 'NOT_FOUND', 'Student access record not found.');
        }
        if (targetStatus === 'REVOKED' && updatedAccess.authUserId) {
            this.invalidateIdentityCache?.(updatedAccess.authUserId);
            const body = `Your account has been deactivated. Please contact the administrator${this.supportEmail ? ` at ${this.supportEmail}` : '.'}`;
            if (this.notificationService) {
                await this.notificationService.create({
                    recipientAuthUserId: updatedAccess.authUserId,
                    title: 'Account deactivated',
                    message: body,
                    type: 'system',
                    relatedRoute: '/account-deactivated',
                });
            }
            if (this.pushService) {
                this.pushService.sendPush({
                    targetType: 'INDIVIDUAL',
                    targetAuthUserIds: [updatedAccess.authUserId],
                    title: 'Account deactivated',
                    body,
                    type: 'ACCOUNT_REVOKED',
                    actionRoute: '/account-deactivated',
                    supportEmail: this.supportEmail,
                }).catch((error) => console.error('[StudentService] Revocation push failed:', error.message));
            }
        }
        return updatedAccess;
    }
    async delete(id) {
        await this.getById(id);
        const deleted = await this.repository.delete(id);
        if (!deleted) {
            throw new ApiError(404, 'NOT_FOUND', 'Student not found.');
        }
    }
    async registerStudentAuth(prn, password) {
        return this.repository.registerStudentAuth(prn, password);
    }
    async getPerformance(id) {
        await this.getById(id);
        return this.repository.getPerformance(id);
    }
}
