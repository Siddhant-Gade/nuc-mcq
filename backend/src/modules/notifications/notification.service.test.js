import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError } from '../../utils/api-error.js';
import { NotificationService } from './notification.service.js';
const USER_A = '00000000-0000-4000-8000-0000000000a1';
const USER_B = '00000000-0000-4000-8000-0000000000b2';
class FakeNotificationRepository {
    rows = [];
    sequence = 0;
    async listForRecipient(recipientAuthUserId) {
        return this.rows
            .filter((row) => row.recipientAuthUserId === recipientAuthUserId)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .map((row) => ({ ...row }));
    }
    async countUnread(recipientAuthUserId) {
        return this.rows.filter((row) => row.recipientAuthUserId === recipientAuthUserId && !row.isRead).length;
    }
    async getById(id) {
        const row = this.rows.find((candidate) => candidate.id === id);
        return row === undefined ? undefined : { ...row };
    }
    async markRead(id, recipientAuthUserId) {
        const row = this.rows.find((candidate) => candidate.id === id && candidate.recipientAuthUserId === recipientAuthUserId);
        if (row === undefined) {
            return undefined;
        }
        row.isRead = true;
        row.readAt = new Date();
        row.updatedAt = row.readAt;
        return { ...row };
    }
    async markAllRead(recipientAuthUserId) {
        let updated = 0;
        for (const row of this.rows) {
            if (row.recipientAuthUserId === recipientAuthUserId && !row.isRead) {
                row.isRead = true;
                row.readAt = new Date();
                updated += 1;
            }
        }
        return updated;
    }
    async insert(record) {
        this.sequence += 1;
        const inserted = {
            ...record,
            id: `notification-${this.sequence}`,
            // Strictly increasing so newest-first ordering is deterministic.
            createdAt: new Date(Date.UTC(2026, 7, 26, 8, 0, this.sequence)),
            updatedAt: new Date(),
        };
        this.rows.push(inserted);
        return inserted;
    }
}
test('create defaults the type to system and stores an unread row', async () => {
    const repository = new FakeNotificationRepository();
    const service = new NotificationService(repository);
    const created = await service.create({ recipientAuthUserId: USER_A, title: 'Hello', message: 'Body' });
    assert.equal(created.type, 'system');
    assert.equal(created.isRead, false);
    assert.equal(created.readAt, null);
});
test('list and unread-count are scoped strictly to the caller', async () => {
    const repository = new FakeNotificationRepository();
    const service = new NotificationService(repository);
    await service.create({ recipientAuthUserId: USER_A, title: 'A1', message: 'x', type: 'announcement' });
    await service.create({ recipientAuthUserId: USER_B, title: 'B1', message: 'x' });
    await service.create({ recipientAuthUserId: USER_A, title: 'A2', message: 'x', relatedRoute: '/' });
    const ownList = await service.list(USER_A);
    assert.deepEqual(ownList.map((row) => row.title), ['A2', 'A1']);
    assert.equal(await service.unreadCount(USER_A), 2);
    assert.equal(await service.unreadCount(USER_B), 1);
});
test('mark-read stamps readAt and is idempotent for already-read rows', async () => {
    const repository = new FakeNotificationRepository();
    const service = new NotificationService(repository);
    const created = await service.create({ recipientAuthUserId: USER_A, title: 'A1', message: 'x' });
    const first = await service.markRead(USER_A, created.id);
    assert.equal(first.isRead, true);
    assert.ok(first.readAt instanceof Date);
    const second = await service.markRead(USER_A, created.id);
    assert.equal(second.isRead, true);
    assert.equal(await service.unreadCount(USER_A), 0);
});
test('a foreign notification id is indistinguishable from a missing one', async () => {
    const repository = new FakeNotificationRepository();
    const service = new NotificationService(repository);
    const foreign = await service.create({ recipientAuthUserId: USER_B, title: 'B1', message: 'x' });
    await service.create({ recipientAuthUserId: USER_A, title: 'A1', message: 'x' });
    await assert.rejects(service.markRead(USER_A, foreign.id), (error) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.statusCode, 404);
        return true;
    });
    // The foreign row was untouched.
    const untouched = await repository.getById(foreign.id);
    assert.equal(untouched?.isRead, false);
});
test('mark-all-read only affects the caller and reports the touched count', async () => {
    const repository = new FakeNotificationRepository();
    const service = new NotificationService(repository);
    await service.create({ recipientAuthUserId: USER_A, title: 'A1', message: 'x' });
    await service.create({ recipientAuthUserId: USER_A, title: 'A2', message: 'x' });
    await service.create({ recipientAuthUserId: USER_B, title: 'B1', message: 'x' });
    const outcome = await service.markAllRead(USER_A);
    assert.equal(outcome.updatedCount, 2);
    assert.equal(await service.unreadCount(USER_A), 0);
    assert.equal(await service.unreadCount(USER_B), 1);
});
