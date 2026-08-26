import { ApiError } from '../../utils/api-error.js';
import type { StudentAccessRecord, StudentRecord } from '../students/student.types.js';

export type ResolvedStudentIdentity = {
  profile: StudentRecord;
  access: StudentAccessRecord;
};

/**
 * Phase 10: resolves a verified JWT identity to the application student.
 * The client is never accepted as proof of identity — only
 * `student_access.auth_user_id`, written exclusively by admin approval,
 * establishes the link (SYSTEM_DESIGN.md §10/§17).
 */
export class StudentIdentityService {
  public constructor(
    private readonly findStudentByAuthUserId: (
      authUserId: string,
    ) => Promise<ResolvedStudentIdentity | undefined>,
  ) {}

  /** Returns undefined when the auth identity is not linked to any student. */
  public async resolve(authUserId: string): Promise<ResolvedStudentIdentity | undefined> {
    return this.findStudentByAuthUserId(authUserId);
  }

  /**
   * Strict variant for protected student workflows: unmapped identities and
   * non-ACTIVE access are rejected. Used by result sync (Phase 11).
   */
  public async requireActive(authUserId: string): Promise<ResolvedStudentIdentity> {
    const resolved = await this.resolve(authUserId);

    if (resolved === undefined) {
      throw new ApiError(403, 'STUDENT_IDENTITY_NOT_LINKED', 'No student profile is linked to this account.');
    }

    if (resolved.access.status !== 'ACTIVE') {
      throw new ApiError(403, 'STUDENT_ACCESS_INACTIVE', `Student access is ${resolved.access.status}; ACTIVE access is required.`);
    }

    return resolved;
  }
}
