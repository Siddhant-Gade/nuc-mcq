import { ApiError } from '../../utils/api-error.js';
export class NotificationService {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async list(recipientAuthUserId) {
        return this.repository.listForRecipient(recipientAuthUserId);
    }
    async unreadCount(recipientAuthUserId) {
        return this.repository.countUnread(recipientAuthUserId);
    }
    /**
     * Marks one of the caller's own notifications read. A foreign or unknown id
     * is indistinguishable 404 so ownership cannot be probed.
     */
    async markRead(recipientAuthUserId, id) {
        const updated = await this.repository.markRead(id, recipientAuthUserId);
        if (updated === undefined) {
            throw new ApiError(404, 'NOT_FOUND', `No notification with id ${id} was found for this account.`);
        }
        return updated;
    }
    async markAllRead(recipientAuthUserId) {
        const updatedCount = await this.repository.markAllRead(recipientAuthUserId);
        return { updatedCount };
    }
    /**
     * Internal creation path (module hooks + tests). Recipients are always
     * application user ids resolved server-side; no fan-out/audience policy is
     * implemented until the product confirms notification triggers.
     */
    async create(input) {
        return this.repository.insert({
            recipientAuthUserId: input.recipientAuthUserId,
            title: input.title,
            message: input.message,
            type: input.type ?? 'system',
            relatedRoute: input.relatedRoute ?? null,
            isRead: false,
            readAt: null,
        });
    }
}
