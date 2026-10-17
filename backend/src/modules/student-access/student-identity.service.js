import { ApiError } from '../../utils/api-error.js';
/**
 * Phase 10: resolves a verified JWT identity to the application student.
 * The client is never accepted as proof of identity — only
 * `student_access.auth_user_id`, written exclusively by admin approval,
 * establishes the link (SYSTEM_DESIGN.md §10/§17).
 */
export class StudentIdentityService {
    findStudentByAuthUserId;
    findStudentByEmail;
    findStudentByStudentId;
    constructor(findStudentByAuthUserId, findStudentByEmail, findStudentByStudentId) {
        this.findStudentByAuthUserId = findStudentByAuthUserId;
        this.findStudentByEmail = findStudentByEmail;
        this.findStudentByStudentId = findStudentByStudentId;
    }
    async findByEmail(email) {
        return this.findStudentByEmail?.(email);
    }
    async findByStudentId(studentId) {
        return this.findStudentByStudentId?.(studentId);
    }
    /** Returns undefined when the auth identity is not linked to any student. */
    async resolve(authUserId, email) {
        const byAuth = await this.findStudentByAuthUserId(authUserId);
        if (byAuth !== undefined) {
            return byAuth;
        }
        if (email && this.findStudentByEmail) {
            return this.findStudentByEmail(email);
        }
        return undefined;
    }
    /**
     * Strict variant for protected student workflows: unmapped identities and
     * non-ACTIVE access are rejected. Used by result sync (Phase 11).
     */
    async requireActive(authUserId, email) {
        const resolved = await this.resolve(authUserId, email);
        if (resolved === undefined) {
            throw new ApiError(403, 'STUDENT_IDENTITY_NOT_LINKED', 'No student profile is linked to this account.');
        }
        if (resolved.access.status === 'SUSPENDED') {
            throw new ApiError(403, 'STUDENT_ACCESS_SUSPENDED', resolved.access.suspensionReason || 'Student access has been suspended by the administrator.');
        }
        if (resolved.access.status !== 'ACTIVE') {
            throw new ApiError(403, 'STUDENT_ACCESS_INACTIVE', `Student access is ${resolved.access.status}; ACTIVE access is required.`);
        }
        return resolved;
    }
}
