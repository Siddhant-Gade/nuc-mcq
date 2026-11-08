import { and, eq, inArray } from 'drizzle-orm';
import { studentAccess, studentDeviceTokens, studentProfiles } from './schema/index.js';

export class DrizzleDeviceTokenRepository {
    database;
    constructor(database) {
        this.database = database;
    }

    /**
     * Upsert a device token for an authenticated student.
     */
    async upsertToken(authUserId, fcmToken, devicePlatform = 'android') {
        const now = new Date();
        const [existing] = await this.database
            .select()
            .from(studentDeviceTokens)
            .where(eq(studentDeviceTokens.fcmToken, fcmToken))
            .limit(1);

        if (existing) {
            await this.database
                .update(studentDeviceTokens)
                .set({
                    authUserId,
                    devicePlatform,
                    lastSeenAt: now,
                })
                .where(eq(studentDeviceTokens.id, existing.id));
            return;
        }

        await this.database.insert(studentDeviceTokens).values({
            authUserId,
            fcmToken,
            devicePlatform,
            lastSeenAt: now,
            createdAt: now,
        });
    }

    /**
     * Remove a token on logout or invalidation.
     */
    async deleteToken(fcmToken) {
        await this.database
            .delete(studentDeviceTokens)
            .where(eq(studentDeviceTokens.fcmToken, fcmToken));
    }

    /**
     * Delete multiple invalid/unregistered tokens.
     */
    async deleteTokens(fcmTokens) {
        if (!fcmTokens || fcmTokens.length === 0) return;
        return this.database
            .delete(studentDeviceTokens)
            .where(inArray(studentDeviceTokens.fcmToken, fcmTokens));
    }

    /**
     * Get tokens for a specific student.
     */
    async getTokensForUser(authUserId) {
        return this.database
            .select({ fcmToken: studentDeviceTokens.fcmToken })
            .from(studentDeviceTokens)
            .where(eq(studentDeviceTokens.authUserId, authUserId));
    }

    /**
     * Get tokens for a list of student user IDs (only ACTIVE students).
     */
    async getTokensForUsers(authUserIds) {
        if (!authUserIds || authUserIds.length === 0) return [];
        return this.database
            .select({ fcmToken: studentDeviceTokens.fcmToken })
            .from(studentDeviceTokens)
            .innerJoin(
                studentAccess,
                eq(studentAccess.authUserId, studentDeviceTokens.authUserId)
            )
            .where(and(
                inArray(studentDeviceTokens.authUserId, authUserIds),
                eq(studentAccess.status, 'ACTIVE')
            ));
    }

    async getTokensForAuthUsers(authUserIds) {
        return this.getTokensForUsers(authUserIds);
    }

    /**
     * Get all active tokens for ACTIVE students.
     */
    async getAllTokens() {
        return this.database
            .select({ fcmToken: studentDeviceTokens.fcmToken })
            .from(studentDeviceTokens)
            .innerJoin(
                studentAccess,
                eq(studentAccess.authUserId, studentDeviceTokens.authUserId)
            )
            .where(eq(studentAccess.status, 'ACTIVE'));
    }

    /**
     * Get tokens for students enrolled in a specific batch (ACTIVE students only).
     */
    async getTokensForBatch(batchId) {
        return this.database
            .select({ fcmToken: studentDeviceTokens.fcmToken })
            .from(studentDeviceTokens)
            .innerJoin(
                studentAccess,
                eq(studentAccess.authUserId, studentDeviceTokens.authUserId)
            )
            .innerJoin(
                studentProfiles,
                eq(studentProfiles.id, studentAccess.studentProfileId)
            )
            .where(and(
                eq(studentProfiles.batchId, batchId),
                eq(studentAccess.status, 'ACTIVE')
            ));
    }

    /**
     * Get tokens for students enrolled in any of the specified batches (ACTIVE students only).
     */
    async getTokensForBatches(batchIds) {
        if (!batchIds || batchIds.length === 0) return [];
        return this.database
            .select({ fcmToken: studentDeviceTokens.fcmToken })
            .from(studentDeviceTokens)
            .innerJoin(
                studentAccess,
                eq(studentAccess.authUserId, studentDeviceTokens.authUserId)
            )
            .innerJoin(
                studentProfiles,
                eq(studentProfiles.id, studentAccess.studentProfileId)
            )
            .where(and(
                inArray(studentProfiles.batchId, batchIds),
                eq(studentAccess.status, 'ACTIVE')
            ));
    }
}
