import { ApiError } from '../../utils/api-error.js';
import { isUniqueViolation } from '../../utils/db-errors.js';
export class TeacherService {
    repository;
    constructor(repository) { this.repository = repository; }
    async list() { return this.repository.list(); }
    async getById(id) {
        const teacher = await this.repository.findById(id);
        if (teacher === undefined) throw new ApiError(404, 'NOT_FOUND', `No teacher with id ${id} was found.`);
        return teacher;
    }
    async create(input) {
        try {
            return await this.repository.create({
                name: input.name,
                email: input.email.toLowerCase(),
                mobile: input.mobile ?? null,
                subject: input.subject ?? null,
                instituteId: input.instituteId ?? 'INST001',
            });
        } catch (error) {
            if (isUniqueViolation(error)) throw new ApiError(409, 'CONFLICT', 'A teacher with this email already exists.');
            throw error;
        }
    }
    async update(id, input) {
        if (Object.keys(input).length === 0) throw new ApiError(400, 'VALIDATION_ERROR', 'Provide at least one field to update.');
        await this.getById(id);
        const fields = {};
        if (input.name !== undefined) fields.name = input.name;
        if (input.email !== undefined) fields.email = input.email.toLowerCase();
        if ('mobile' in input) fields.mobile = input.mobile;
        if ('subject' in input) fields.subject = input.subject;
        try {
            const updated = await this.repository.update(id, fields);
            if (updated === undefined) throw new ApiError(404, 'NOT_FOUND', `No teacher with id ${id} was found.`);
            return { ...updated, assignedBatchId: null, assignedBatchName: null };
        } catch (error) {
            if (isUniqueViolation(error)) throw new ApiError(409, 'CONFLICT', 'A teacher with this email already exists.');
            throw error;
        }
    }
    async remove(id) {
        await this.getById(id);
        const deleted = await this.repository.remove(id);
        if (deleted === undefined) throw new ApiError(404, 'NOT_FOUND', `No teacher with id ${id} was found.`);
    }
}
