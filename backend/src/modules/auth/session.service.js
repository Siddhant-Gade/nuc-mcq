import crypto from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { authSessions } from '../../database/schema/index.js';

export function hashToken(rawToken) {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export class SessionService {
    database;
    idleTimeoutMs;
    absoluteTimeoutMs;
    memoryStore = new Map();

    constructor(database, options = {}) {
        this.database = database;
        this.idleTimeoutMs = options.idleTimeoutMs ?? 30 * 60 * 1000; // 30 minutes
        this.absoluteTimeoutMs = options.absoluteTimeoutMs ?? 24 * 60 * 60 * 1000; // 24 hours
    }

    async createSession({ authUserId, clientType, identity, userAgent, ipAddress, ttlSeconds = 86400 }) {
        const rawToken = crypto.randomBytes(32).toString('base64url');
        const tokenHash = hashToken(rawToken);
        const now = new Date();
        const expiresAt = new Date(now.getTime() + (ttlSeconds * 1000));

        const sessionRecord = {
            id: crypto.randomUUID(),
            tokenHash,
            authUserId,
            clientType,
            identity,
            createdAt: now,
            lastUsedAt: now,
            expiresAt,
            revokedAt: null,
            userAgent: userAgent || null,
            ipAddress: ipAddress || null,
        };

        if (this.database) {
            await this.database.insert(authSessions).values({
                id: sessionRecord.id,
                tokenHash,
                authUserId,
                clientType,
                identity,
                createdAt: now,
                lastUsedAt: now,
                expiresAt,
                userAgent: sessionRecord.userAgent,
                ipAddress: sessionRecord.ipAddress,
            });
        } else {
            this.memoryStore.set(tokenHash, sessionRecord);
        }

        return {
            rawToken,
            tokenHash,
            expiresAt,
            authUserId,
            identity,
        };
    }

    async validateSession(rawToken) {
        if (!rawToken || typeof rawToken !== 'string') {
            return null;
        }

        const tokenHash = hashToken(rawToken);
        let session = null;

        if (this.database) {
            const rows = await this.database
                .select()
                .from(authSessions)
                .where(and(eq(authSessions.tokenHash, tokenHash), isNull(authSessions.revokedAt)))
                .limit(1);
            session = rows[0] || null;
        } else {
            const mem = this.memoryStore.get(tokenHash);
            if (mem && !mem.revokedAt) {
                session = mem;
            }
        }

        if (!session) {
            return null;
        }

        const now = new Date();

        // Check absolute expiry
        if (new Date(session.expiresAt) <= now) {
            return null;
        }

        // Check idle timeout
        const lastUsed = new Date(session.lastUsedAt).getTime();
        if (now.getTime() - lastUsed > this.idleTimeoutMs) {
            await this.revokeSession(rawToken);
            return null;
        }

        // Throttle updating lastUsedAt: only update if more than 60 seconds have elapsed
        if (now.getTime() - lastUsed >= 60 * 1000) {
            session.lastUsedAt = now;
            if (this.database) {
                try {
                    await this.database
                        .update(authSessions)
                        .set({ lastUsedAt: now })
                        .where(eq(authSessions.id, session.id));
                } catch (_) {}
            }
        }

        return session;
    }

    async revokeSession(rawToken) {
        if (!rawToken || typeof rawToken !== 'string') {
            return;
        }
        const tokenHash = hashToken(rawToken);
        const now = new Date();

        if (this.database) {
            await this.database
                .update(authSessions)
                .set({ revokedAt: now })
                .where(and(eq(authSessions.tokenHash, tokenHash), isNull(authSessions.revokedAt)));
        } else {
            const mem = this.memoryStore.get(tokenHash);
            if (mem) {
                mem.revokedAt = now;
            }
        }
    }

    async revokeAllSessionsForUser(authUserId) {
        if (!authUserId) {
            return;
        }
        const now = new Date();

        if (this.database) {
            await this.database
                .update(authSessions)
                .set({ revokedAt: now })
                .where(and(eq(authSessions.authUserId, authUserId), isNull(authSessions.revokedAt)));
        } else {
            for (const session of this.memoryStore.values()) {
                if (session.authUserId === authUserId && !session.revokedAt) {
                    session.revokedAt = now;
                }
            }
        }
    }
}
