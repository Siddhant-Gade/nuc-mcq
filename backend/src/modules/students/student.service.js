import { ApiError } from '../../utils/api-error.js';
import { isUniqueViolation } from '../../utils/db-errors.js';

const allowedStatusTransitions = {
    PENDING: ['ACTIVE'],
    ACTIVE: ['EXPIRED', 'REVOKED', 'SUSPENDED'],
    EXPIRED: [],
    REVOKED: ['PENDING', 'ACTIVE'],
    SUSPENDED: ['ACTIVE', 'REVOKED'],
};

export class StudentService {
    repository;
    sessionService;
    batchRepository;

    constructor(repository, sessionService, batchRepository) {
        this.repository = repository;
        this.sessionService = sessionService;
        this.batchRepository = batchRepository;
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
            if (this.batchRepository && input.batchId) {
                const batch = await this.batchRepository.findById(input.batchId);
                if (!batch) {
                    throw new ApiError(400, 'BATCH_NOT_FOUND', 'The selected batch does not exist.');
                }
            }
            return await this.repository.create(input);
        }
        catch (error) {
            if (error instanceof ApiError) throw error;
            if (isUniqueViolation(error)) {
                const detail = String(error.detail || error.message || '').toLowerCase();
                if (detail.includes('email')) {
                    throw new ApiError(409, 'CONFLICT', 'A student with this Email already exists.');
                }
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

    async updateAccessStatus(id, targetStatus, metadata = {}) {
        const currentAccess = await this.getAccessByStudentId(id);
        if (!allowedStatusTransitions[currentAccess.status]?.includes(targetStatus)) {
            throw new ApiError(422, 'BUSINESS_RULE_ERROR', `Student access cannot transition from ${currentAccess.status} to ${targetStatus}.`);
        }
        const updatedAccess = await this.repository.updateAccessStatus(id, targetStatus, metadata);
        if (updatedAccess === undefined) {
            throw new ApiError(404, 'NOT_FOUND', 'Student access record not found.');
        }
        return updatedAccess;
    }

    async suspend(id, reason, suspendedBy) {
        const student = await this.getById(id);
        const currentAccess = await this.getAccessByStudentId(id);
        if (currentAccess.status === 'SUSPENDED') {
            return {
                studentId: student.studentId,
                accessStatus: 'SUSPENDED',
                suspendedAt: currentAccess.suspendedAt,
                suspensionReason: currentAccess.suspensionReason,
            };
        }
        const updatedAccess = await this.updateAccessStatus(id, 'SUSPENDED', { reason, suspendedBy });
        if (this.sessionService && updatedAccess.authUserId) {
            await this.sessionService.revokeAllSessionsForUser(updatedAccess.authUserId);
        }
        return {
            studentId: student.studentId,
            accessStatus: 'SUSPENDED',
            suspendedAt: updatedAccess.suspendedAt,
            suspensionReason: updatedAccess.suspensionReason,
        };
    }

    async restore(id) {
        const student = await this.getById(id);
        const currentAccess = await this.getAccessByStudentId(id);
        if (currentAccess.status === 'ACTIVE') {
            return {
                studentId: student.studentId,
                accessStatus: 'ACTIVE',
            };
        }
        await this.updateAccessStatus(id, 'ACTIVE');
        return {
            studentId: student.studentId,
            accessStatus: 'ACTIVE',
        };
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
