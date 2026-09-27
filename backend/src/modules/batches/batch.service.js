import { ApiError } from '../../utils/api-error.js';
import { isUniqueViolation } from '../../utils/db-errors.js';
/**
 * V1 status policy (documented in docs/backend-reference.md §Batch Module):
 * - A stored status of INACTIVE always wins (manual deactivation).
 * - Otherwise the batch is FULL when the aggregated enrollment reaches capacity.
 * - Any other case is ACTIVE. FULL itself is never persisted; it is derived.
 */
export const deriveEffectiveStatus = (storedStatus, enrolledCount, capacity) => {
    if (storedStatus === 'INACTIVE') {
        return 'INACTIVE';
    }
    return enrolledCount >= capacity ? 'FULL' : 'ACTIVE';
};
export class BatchService {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    toResponseRecord(record, enrolledCount) {
        return {
            batchId: record.batchId,
            batchName: record.batchName,
            instituteId: record.instituteId,
            capacity: record.capacity,
            timing: record.timing ?? null,
            enrolledCount,
            status: deriveEffectiveStatus(record.status, enrolledCount, record.capacity),
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
        };
    }
    async list() {
        const records = await this.repository.list();
        return records.map((record) => this.toResponseRecord(record, record.enrolledCount));
    }
    async listAvailableForAdmission() {
        const all = await this.list();
        return all.filter((batch) => batch.status === 'ACTIVE');
    }
    async getById(batchId) {
        const stored = await this.repository.findById(batchId);
        if (stored === undefined) {
            throw new ApiError(404, 'NOT_FOUND', 'Batch not found.');
        }
        const enrolledCount = await this.repository.countAssignedStudents(batchId);
        return this.toResponseRecord(stored, enrolledCount);
    }
    async create(input) {
        try {
            const stored = await this.repository.create(input);
            return this.toResponseRecord(stored, 0);
        }
        catch (error) {
            if (isUniqueViolation(error)) {
                throw new ApiError(409, 'CONFLICT', 'A batch with this Batch ID already exists.');
            }
            throw error;
        }
    }
    /**
     * V1 deletion policy default (pending explicit product confirmation):
     * a batch with assigned students cannot be deleted. This prevents orphaned
     * student_profile rows while student_profile.batch_id has no foreign key.
     */
    async remove(batchId) {
        const stored = await this.repository.findById(batchId);
        if (stored === undefined) {
            throw new ApiError(404, 'NOT_FOUND', 'Batch not found.');
        }
        const assignedStudents = await this.repository.countAssignedStudents(batchId);
        if (assignedStudents > 0) {
            throw new ApiError(409, 'CONFLICT', `Cannot delete batch ${batchId} while ${assignedStudents} student(s) are assigned to it.`);
        }
        const removed = await this.repository.remove(batchId);
        if (removed === undefined) {
            throw new ApiError(404, 'NOT_FOUND', 'Batch not found.');
        }
    }
}
