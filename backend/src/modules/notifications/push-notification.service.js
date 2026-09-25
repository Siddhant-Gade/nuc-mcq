import { getFirebaseAdmin, isFirebaseReady } from '../../config/firebase.js';

export class PushNotificationService {
    tokenRepository;

    constructor(tokenRepository) {
        this.tokenRepository = tokenRepository;
    }

    /**
     * Send push notification to all students, a batch, or selected individuals.
     */
    async sendPush({ targetType, targetBatchId, targetAuthUserIds, title, body, type = 'ANNOUNCEMENT', materialId, actionRoute }) {
        let tokens = [];

        if (targetType === 'ALL') {
            const rows = await this.tokenRepository.getAllTokens();
            tokens = rows.map((r) => r.fcmToken);
        } else if (targetType === 'BATCH' && targetBatchId) {
            const rows = await this.tokenRepository.getTokensForBatch(targetBatchId);
            tokens = rows.map((r) => r.fcmToken);
        } else if (targetType === 'INDIVIDUAL' && Array.isArray(targetAuthUserIds)) {
            const rows = await this.tokenRepository.getTokensForAuthUsers(targetAuthUserIds);
            tokens = rows.map((r) => r.fcmToken);
        }

        if (tokens.length === 0) {
            return { sentCount: 0, failedCount: 0, message: 'No registered device tokens found for target.' };
        }

        return this.sendToTokens(tokens, { title, body, type, materialId, actionRoute });
    }

    /**
     * Internal sender using sendEachForMulticast with invalid token auto-pruning.
     */
    async sendToTokens(tokens, { title, body, type, materialId, actionRoute }) {
        if (!isFirebaseReady()) {
            console.log(`[FCM Mock] Would send push "${title}" to ${tokens.length} devices.`);
            return { sentCount: tokens.length, failedCount: 0, mock: true };
        }

        const admin = getFirebaseAdmin();
        const dataPayload = {
            type: String(type),
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
        };
        if (materialId) dataPayload.materialId = String(materialId);
        if (actionRoute) dataPayload.actionRoute = String(actionRoute);

        // FCM multicast limit is 500 tokens per batch
        const chunkSize = 500;
        let totalSent = 0;
        let totalFailed = 0;
        const invalidTokens = [];

        for (let i = 0; i < tokens.length; i += chunkSize) {
            const chunk = tokens.slice(i, i + chunkSize);
            const message = {
                notification: {
                    title,
                    body,
                },
                data: dataPayload,
                tokens: chunk,
                android: {
                    priority: 'high',
                    notification: {
                        channelId: 'nuc_priority_channel',
                        icon: 'ic_nuc_notification',
                        sound: 'default',
                        defaultSound: true,
                        defaultVibrateTimings: true,
                        notificationPriority: 'PRIORITY_MAX',
                    },
                },
            };

            try {
                const response = await admin.messaging().sendEachForMulticast(message);
                totalSent += response.successCount;
                totalFailed += response.failureCount;

                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        const errorCode = resp.error?.code;
                        if (
                            errorCode === 'messaging/invalid-registration-token' ||
                            errorCode === 'messaging/registration-token-not-registered'
                        ) {
                            invalidTokens.push(chunk[idx]);
                        }
                    }
                });
            } catch (err) {
                console.error('[FCM] Batch send error:', err);
                totalFailed += chunk.length;
            }
        }

        // Clean up dead/uninstalled tokens automatically
        if (invalidTokens.length > 0) {
            await this.tokenRepository.deleteTokens(invalidTokens);
            console.log(`[FCM] Pruned ${invalidTokens.length} unregistered tokens from database.`);
        }

        return { sentCount: totalSent, failedCount: totalFailed };
    }
}
