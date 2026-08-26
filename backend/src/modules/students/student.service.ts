import { ApiError } from '../../utils/api-error.js';
import type {
  CreateStudentInput,
  StudentAccessRecord,
  StudentAccessStatus,
  StudentRecord,
  StudentWithAccessRecord,
  UpdateStudentInput,
} from './student.types.js';
import type { StudentRepository } from './student.repository.js';

const allowedStatusTransitions: Record<StudentAccessStatus, StudentAccessStatus[]> = {
  PENDING: ['ACTIVE'],
  ACTIVE: ['EXPIRED', 'REVOKED'],
  EXPIRED: [],
  REVOKED: [],
};

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';

export class StudentService {
  public constructor(private readonly repository: StudentRepository) {}

  public async list(): Promise<StudentWithAccessRecord[]> {
    return this.repository.list();
  }

  public async getById(id: string): Promise<StudentRecord> {
    const student = await this.repository.findById(id);

    if (student === undefined) {
      throw new ApiError(404, 'NOT_FOUND', 'Student not found.');
    }

    return student;
  }

  public async getAccessByStudentId(studentProfileId: string): Promise<StudentAccessRecord> {
    await this.getById(studentProfileId);
    const access = await this.repository.findAccessByStudentId(studentProfileId);

    if (access === undefined) {
      throw new ApiError(404, 'NOT_FOUND', 'Student access record not found.');
    }

    return access;
  }

  public async create(input: CreateStudentInput): Promise<StudentWithAccessRecord> {
    try {
      return await this.repository.create(input);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ApiError(409, 'CONFLICT', 'A student with this Student ID already exists.');
      }

      throw error;
    }
  }

  public async update(id: string, input: UpdateStudentInput): Promise<StudentRecord> {
    const student = await this.repository.update(id, input);

    if (student === undefined) {
      throw new ApiError(404, 'NOT_FOUND', 'Student not found.');
    }

    return student;
  }

  public async updateAccessStatus(id: string, targetStatus: StudentAccessStatus): Promise<StudentAccessRecord> {
    const currentAccess = await this.getAccessByStudentId(id);

    if (!allowedStatusTransitions[currentAccess.status].includes(targetStatus)) {
      throw new ApiError(
        422,
        'BUSINESS_RULE_ERROR',
        `Student access cannot transition from ${currentAccess.status} to ${targetStatus}.`,
      );
    }

    const updatedAccess = await this.repository.updateAccessStatus(id, targetStatus);

    if (updatedAccess === undefined) {
      throw new ApiError(404, 'NOT_FOUND', 'Student access record not found.');
    }

    return updatedAccess;
  }
}
