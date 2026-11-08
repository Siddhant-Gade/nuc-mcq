import assert from 'node:assert/strict';
import test from 'node:test';

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://localhost:5432/test';
process.env.SUPABASE_JWT_ISSUER = process.env.SUPABASE_JWT_ISSUER || 'https://test.supabase.co';

const { PushNotificationService } = await import('./push-notification.service.js');

class FakeDeviceTokenRepository {
    tokens = [];
    deleted = [];

    async getAllTokens() {
        return this.tokens.map((t) => ({ fcmToken: t }));
    }

    async getTokensForBatch(batchId) {
        return this.tokens.map((t) => ({ fcmToken: t }));
    }

    async getTokensForBatches(batchIds) {
        return this.tokens.map((t) => ({ fcmToken: t }));
    }

    async getTokensForAuthUsers(userIds) {
        return this.tokens.map((t) => ({ fcmToken: t }));
    }

    async deleteTokens(toDelete) {
        this.deleted.push(...toDelete);
        this.tokens = this.tokens.filter((t) => !toDelete.includes(t));
    }
}

test('PushNotificationService: returns 0 when no tokens registered', async () => {
    const repo = new FakeDeviceTokenRepository();
    repo.tokens = [];
    const service = new PushNotificationService(repo);

    const result = await service.sendPush({
        targetType: 'ALL',
        title: 'Announcement',
        body: 'Message',
    });

    assert.equal(result.sentCount, 0);
    assert.equal(result.failedCount, 0);
    assert.match(result.message, /No registered device tokens/);
});

test('PushNotificationService: deduplicates tokens and resolves ALL target', async () => {
    const repo = new FakeDeviceTokenRepository();
    repo.tokens = ['token_1', 'token_2', 'token_1'];
    const service = new PushNotificationService(repo);

    let sentTokens = [];
    service.sendToTokens = async (tokens, payload) => {
        sentTokens = tokens;
        return { sentCount: tokens.length, failedCount: 0 };
    };

    const result = await service.sendPush({
        targetType: 'ALL',
        title: 'Broadcast',
        body: 'Notice',
        broadcastId: 'b-1',
    });

    assert.equal(result.sentCount, 2);
    assert.deepEqual(sentTokens, ['token_1', 'token_2']);
});

test('PushNotificationService: resolves multiple batch IDs cleanly', async () => {
    const repo = new FakeDeviceTokenRepository();
    repo.tokens = ['token_batch_a', 'token_batch_b'];
    const service = new PushNotificationService(repo);

    let sentTokens = [];
    service.sendToTokens = async (tokens, payload) => {
        sentTokens = tokens;
        return { sentCount: tokens.length, failedCount: 0 };
    };

    const result = await service.sendPush({
        targetType: 'BATCH',
        targetBatchIds: ['batch_1', 'batch_2'],
        title: 'Batch Notice',
        body: 'Batch Body',
    });

    assert.equal(result.sentCount, 2);
    assert.deepEqual(sentTokens, ['token_batch_a', 'token_batch_b']);
});
