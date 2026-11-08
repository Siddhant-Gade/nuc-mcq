import { getFirebaseAdmin, isFirebaseReady } from '../../config/firebase.js';

export class PushNotificationService {
    tokenRepository;

    constructor(tokenRepository) {
        this.tokenRepository = tokenRepository;
    }

    /**
     * Send push notification to all students, a batch, multiple batches, or selected individuals.
     */
    async sendPush({
        targetType,
        targetBatchId,
        targetBatchIds,
        targetAuthUserIds,
        title,
        body,
        type = 'ANNOUNCEMENT',
        broadcastId,
        materialId,
        actionRoute,
        supportEmail,
    }) {
        let tokens = [];

        if (targetType === 'ALL') {
            const rows = await this.tokenRepository.getAllTokens();
            tokens = rows.map((r) => r.fcmToken);
        } else if (targetType === 'BATCH') {
            const batches = Array.isArray(targetBatchIds) && targetBatchIds.length > 0
                ? targetBatchIds
                : (targetBatchId ? [targetBatchId] : []);

            if (batches.length > 0) {
                if (typeof this.tokenRepository.getTokensForBatches === 'function') {
                    const rows = await this.tokenRepository.getTokensForBatches(batches);
                    tokens = rows.map((r) => r.fcmToken);
                } else if (batches.length === 1 && typeof this.tokenRepository.getTokensForBatch === 'function') {
                    const rows = await this.tokenRepository.getTokensForBatch(batches[0]);
                    tokens = rows.map((r) => r.fcmToken);
                }
            }
        } else if (targetType === 'INDIVIDUAL' && Array.isArray(targetAuthUserIds)) {
            const rows = await this.tokenRepository.getTokensForAuthUsers(targetAuthUserIds);
            tokens = rows.map((r) => r.fcmToken);
        }

        // Deduplicate and filter non-empty tokens
        tokens = [...new Set(tokens.filter((t) => typeof t === 'string' && t.trim().length > 0))];

        console.info(
            `[FCM] Target resolved: type=${targetType}, recipientTokens=${tokens.length}, title="${title}"`
        );

        if (tokens.length === 0) {
            console.warn(`[FCM] No registered device tokens found for target ${targetType}.`);
            return { sentCount: 0, failedCount: 0, message: 'No registered device tokens found for target.' };
        }

        return this.sendToTokens(tokens, { title, body, type, broadcastId, materialId, actionRoute, supportEmail });
    }

    /**
     * Internal sender using sendEachForMulticast with invalid token auto-pruning.
     */
    async sendToTokens(tokens, { title, body, type, broadcastId, materialId, actionRoute, supportEmail }) {
        if (!isFirebaseReady()) {
            console.info(`[FCM Mock] Dry-run push "${title}" to ${tokens.length} devices (Firebase not ready).`);
            return { sentCount: tokens.length, failedCount: 0, mock: true };
        }

        const admin = getFirebaseAdmin();
        const dataPayload = {
            type: String(type),
            title: String(title),
            body: String(body),
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
        };
        if (broadcastId) dataPayload.broadcastId = String(broadcastId);
        if (materialId) dataPayload.materialId = String(materialId);
        if (actionRoute) dataPayload.actionRoute = String(actionRoute);
        if (supportEmail) dataPayload.supportEmail = String(supportEmail);

        // FCM multicast limit is 500 tokens per batch
        const chunkSize = 500;
        let totalSent = 0;
        let totalFailed = 0;
        const invalidTokens = [];

        // 28 days TTL in milliseconds (Firebase Admin SDK expects milliseconds for AndroidConfig.ttl)
        const ttlMilliseconds = 2419200 * 1000;

        for (let i = 0; i < tokens.length; i += chunkSize) {
            const chunk = tokens.slice(i, i + chunkSize);
            const message = {
                notification: {
                    title: String(title),
                    body: String(body),
                },
                data: dataPayload,
                tokens: chunk,
                android: {
                    priority: 'high',
                    ttl: ttlMilliseconds,
                    notification: {
                        channelId: 'nuc_priority_v2_channel',
                        priority: 'max',
                        notificationCount: 1,
                        icon: 'ic_nuc_notification',
                        color: '#1A73E8',
                        sound: 'default',
                        defaultSound: true,
                        defaultVibrateTimings: true,
                        visibility: 'public',
                        clickAction: 'FLUTTER_NOTIFICATION_CLICK',
                        tag: broadcastId
                            ? `broadcast_${broadcastId}`
                            : (materialId ? `material_${materialId}` : undefined),
                    },
                },
            };

            console.info(`[FCM] Submitting multicast batch ${Math.floor(i / chunkSize) + 1} with ${chunk.length} tokens...`);

            try {
                const response = await admin.messaging().sendEachForMulticast(message);
                totalSent += response.successCount;
                totalFailed += response.failureCount;

                console.info(`[FCM] Multicast batch completed: success=${response.successCount}, failure=${response.failureCount}`);

                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        const errorCode = resp.error?.code || 'unknown';
                        const tokenPrefix = chunk[idx] ? `${chunk[idx].substring(0, 10)}...` : 'unknown';
                        console.warn(`[FCM] Token failure [prefix=${tokenPrefix}]: code=${errorCode}, message=${resp.error?.message}`);

                        if (
                            errorCode === 'messaging/invalid-registration-token' ||
                            errorCode === 'messaging/registration-token-not-registered' ||
                            errorCode === 'messaging/mismatched-credential'
                        ) {
                            invalidTokens.push(chunk[idx]);
                        }
                    }
                });
            } catch (err) {
                console.error('[FCM] Batch send error:', err?.message || err);
                totalFailed += chunk.length;
            }
        }

        // Clean up dead/uninstalled tokens automatically
        if (invalidTokens.length > 0) {
            try {
                await this.tokenRepository.deleteTokens(invalidTokens);
                console.info(`[FCM] Pruned ${invalidTokens.length} unregistered tokens from database.`);
            } catch (pruneErr) {
                console.error('[FCM] Failed to prune invalid tokens (non-fatal):', pruneErr?.message || pruneErr);
            }
        }

        console.info(`[FCM] Push dispatch finished: totalSent=${totalSent}, totalFailed=${totalFailed}, pruned=${invalidTokens.length}`);
        return { sentCount: totalSent, failedCount: totalFailed, prunedCount: invalidTokens.length };
    }
}
