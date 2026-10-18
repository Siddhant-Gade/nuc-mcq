import crypto from 'node:crypto';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { authSessions } from './schema/index.js';
import { SESSION_ABSOLUTE_LIFETIME_MS, SESSION_IDLE_TIMEOUT_MS } from '../config/session.config.js';

export const hashToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

export class DrizzleSessionStore {
    database;
    constructor(database) {
        this.database = database;
    }

    /**
     * Idempotent initialization: ensures the auth_sessions table and indexes exist,
     * and enables Row Level Security (RLS) on it.
     */
    async ensureTable() {
        if (!this.database?.execute) return;
        try {
            await this.database.execute(sql`
                CREATE TABLE IF NOT EXISTS auth_sessions (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    token_hash VARCHAR(64) UNIQUE NOT NULL,
                    auth_user_id UUID NOT NULL,
                    student_profile_id UUID REFERENCES student_profile(id) ON DELETE CASCADE,
                    student_id VARCHAR(100),
                    client_type VARCHAR(50) DEFAULT 'STUDENT_WEB' NOT NULL,
                    identity JSONB NOT NULL,
                    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
                    last_activity_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
                    expires_at TIMESTAMPTZ NOT NULL,
                    absolute_expires_at TIMESTAMPTZ NOT NULL,
                    revoked_at TIMESTAMPTZ,
                    revoked_reason VARCHAR(100),
                    ip_address VARCHAR(45),
                    user_agent TEXT
                );
                CREATE INDEX IF NOT EXISTS auth_sessions_auth_user_idx ON auth_sessions(auth_user_id);
                CREATE INDEX IF NOT EXISTS auth_sessions_expires_at_idx ON auth_sessions(expires_at);
                CREATE UNIQUE INDEX IF NOT EXISTS auth_sessions_token_hash_idx ON auth_sessions(token_hash);
                ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
            `);
        } catch (err) {
            console.warn('[SessionStore] ensureTable warning:', err?.message || err);
        }
    }

    /**
     * Creates a new session record and returns the unhashed raw token (for the cookie)
     * and the created session entity.
     */
    async createSession({
        authUserId,
        studentProfileId = null,
        studentId = null,
        identity,
        clientType = 'STUDENT_WEB',
        ipAddress = null,
        userAgent = null,
    }) {
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = hashToken(rawToken);
        const now = new Date();
        const expiresAt = new Date(now.getTime() + SESSION_IDLE_TIMEOUT_MS);
        const absoluteExpiresAt = new Date(now.getTime() + SESSION_ABSOLUTE_LIFETIME_MS);

        const [session] = await this.database
            .insert(authSessions)
            .values({
                tokenHash,
                authUserId,
                studentProfileId,
                studentId,
                clientType,
                identity,
                createdAt: now,
                lastActivityAt: now,
                expiresAt,
                absoluteExpiresAt,
                revokedAt: null,
                revokedReason: null,
                ipAddress,
                userAgent,
            })
            .returning();

        return { rawToken, session };
    }

    /**
     * Looks up an active session by raw token.
     */
    async findSessionByToken(rawToken) {
        if (!rawToken || typeof rawToken !== 'string') return null;
        const tokenHash = hashToken(rawToken);
        return this.findSessionByTokenHash(tokenHash);
    }

    /**
     * Looks up an active session by token hash.
     */
    async findSessionByTokenHash(tokenHash) {
        if (!tokenHash) return null;
        const [session] = await this.database
            .select()
            .from(authSessions)
            .where(eq(authSessions.tokenHash, tokenHash))
            .limit(1);

        return session || null;
    }

    /**
     * Touches session activity, extending idle expires_at up to absolute_expires_at.
     */
    async touchSessionActivity(sessionId) {
        const now = new Date();
        const newExpiresAt = new Date(now.getTime() + SESSION_IDLE_TIMEOUT_MS);

        try {
            await this.database
                .update(authSessions)
                .set({
                    lastActivityAt: now,
                    expiresAt: sql`LEAST(${newExpiresAt.toISOString()}::timestamptz, absolute_expires_at)`,
                })
                .where(and(eq(authSessions.id, sessionId), isNull(authSessions.revokedAt)));
        } catch (err) {
            console.warn('[SessionStore] touchSessionActivity error:', err?.message || err);
        }
    }

    /**
     * Revokes a single session.
     */
    async revokeSession(sessionId, reason = 'LOGOUT') {
        const now = new Date();
        await this.database
            .update(authSessions)
            .set({
                revokedAt: now,
                revokedReason: reason,
            })
            .where(eq(authSessions.id, sessionId));
    }

    /**
     * Revokes all active sessions for a user (e.g. on student suspension or password reset).
     */
    async revokeAllUserSessions(authUserId, reason = 'ADMIN_REVOKED') {
        if (!authUserId) return;
        const now = new Date();
        await this.database
            .update(authSessions)
            .set({
                revokedAt: now,
                revokedReason: reason,
            })
            .where(and(eq(authSessions.authUserId, authUserId), isNull(authSessions.revokedAt)));
    }

    /**
     * Revokes all active sessions by student profile id (if auth_user_id wasn't known).
     */
    async revokeAllSessionsByStudentProfileId(studentProfileId, reason = 'ADMIN_REVOKED') {
        if (!studentProfileId) return;
        const now = new Date();
        await this.database
            .update(authSessions)
            .set({
                revokedAt: now,
                revokedReason: reason,
            })
            .where(and(eq(authSessions.studentProfileId, studentProfileId), isNull(authSessions.revokedAt)));
    }
}
