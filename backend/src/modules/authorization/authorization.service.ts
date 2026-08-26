import { ApiError } from '../../utils/api-error.js';
import type { AuthorizationRequestRepository } from './authorization.repository.js';
import type {
  AuthorizationRequestRecord,
  AuthorizationRequestStatus,
  AuthorizationRequestView,
} from './authorization.types.js';

export class AuthorizationRequestService {
  public constructor(private readonly repository: AuthorizationRequestRepository) {}

  public async list(status?: AuthorizationRequestStatus): Promise<AuthorizationRequestView[]> {
    return status === undefined ? this.repository.list() : this.repository.listByStatus(status);
  }

  public async getById(id: string): Promise<AuthorizationRequestView> {
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
  public async approve(id: string, reviewerAuthUserId: string): Promise<AuthorizationRequestView> {
    await this.ensureExists(id);
    await this.ensurePending(id);

    const outcome = await this.repository.approve(id, reviewerAuthUserId);

    if (outcome === undefined) {
      // Lost a race with a concurrent review — the request is no longer PENDING.
      throw new ApiError(409, 'CONFLICT', 'Authorization request has already been reviewed.');
    }

    return this.getById(outcome.record.id);
  }

  /** Rejection leaves the student's access record untouched (stays PENDING). */
  public async reject(id: string, reviewerAuthUserId: string): Promise<AuthorizationRequestView> {
    await this.ensureExists(id);
    await this.ensurePending(id);

    const updated = await this.repository.reject(id, reviewerAuthUserId);

    if (updated === undefined) {
      throw new ApiError(409, 'CONFLICT', 'Authorization request has already been reviewed.');
    }

    return this.getById(updated.id);
  }

  private async ensureExists(id: string): Promise<AuthorizationRequestRecord> {
    const record = await this.repository.findById(id);

    if (record === undefined) {
      throw new ApiError(404, 'NOT_FOUND', 'Authorization request not found.');
    }

    return record;
  }

  private async ensurePending(record: AuthorizationRequestRecord): Promise<void>;
  private async ensurePending(id: string): Promise<void>;
  private async ensurePending(idOrRecord: string | AuthorizationRequestRecord): Promise<void> {
    const record =
      typeof idOrRecord === 'string' ? await this.ensureExists(idOrRecord) : idOrRecord;

    if (record.status !== 'PENDING') {
      throw new ApiError(
        409,
        'CONFLICT',
        `Authorization request has already been ${record.status.toLowerCase()}.`,
      );
    }
  }
}
