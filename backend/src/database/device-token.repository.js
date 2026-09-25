import { eq, inArray } from 'drizzle-orm';
import { studentDeviceTokens, studentProfiles } from './schema/index.js';

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
                    updatedAt: now,
                })
                .where(eq(studentDeviceTokens.id, existing.id));
            return;
        }

        await this.database.insert(studentDeviceTokens).values({
            authUserId,
            fcmToken,
            devicePlatform,
            createdAt: now,
            updatedAt: now,
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
     * Get tokens for a list of student user IDs.
     */
    async getTokensForUsers(authUserIds) {
        if (!authUserIds || authUserIds.length === 0) return [];
        return this.database
            .select({ fcmToken: studentDeviceTokens.fcmToken })
            .from(studentDeviceTokens)
            .where(inArray(studentDeviceTokens.authUserId, authUserIds));
    }

    /**
     * Get all active tokens.
     */
    async getAllTokens() {
        return this.database
            .select({ fcmToken: studentDeviceTokens.fcmToken })
            .from(studentDeviceTokens);
    }

    /**
     * Get tokens for students enrolled in a specific batch.
     */
    async getTokensForBatch(batchId) {
        return this.database
            .select({ fcmToken: studentDeviceTokens.fcmToken })
            .from(studentDeviceTokens)
            .innerJoin(
                studentProfiles,
                eq(studentProfiles.studentId, studentDeviceTokens.authUserId)
            )
            .where(eq(studentProfiles.batchId, batchId));
    }
}
