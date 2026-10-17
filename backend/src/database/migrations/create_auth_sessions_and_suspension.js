import { database } from '../client.js';
import { sql } from 'drizzle-orm';

async function migrate() {
    console.log('[Migration] Updating student_access_status enum and student_access table...');
    try {
        await database.execute(sql`
            ALTER TYPE student_access_status ADD VALUE IF NOT EXISTS 'SUSPENDED';
        `);
        console.log('[Migration] student_access_status enum updated.');
    } catch (err) {
        console.warn('[Migration] student_access_status enum update note:', err?.message ?? err);
    }

    await database.execute(sql`
        ALTER TABLE student_access ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
        ALTER TABLE student_access ADD COLUMN IF NOT EXISTS suspended_by UUID;
        ALTER TABLE student_access ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
    `);
    console.log('[Migration] student_access columns verified.');

    console.log('[Migration] Creating auth_session table...');
    await database.execute(sql`
        CREATE TABLE IF NOT EXISTS auth_session (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            token_hash VARCHAR(64) NOT NULL UNIQUE,
            auth_user_id UUID NOT NULL,
            client_type VARCHAR(20) NOT NULL,
            identity JSONB NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            expires_at TIMESTAMPTZ NOT NULL,
            revoked_at TIMESTAMPTZ NULL,
            user_agent TEXT NULL,
            ip_address VARCHAR(45) NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS auth_session_token_hash_idx ON auth_session (token_hash);
        CREATE INDEX IF NOT EXISTS auth_session_auth_user_idx ON auth_session (auth_user_id);
        CREATE INDEX IF NOT EXISTS auth_session_expires_at_idx ON auth_session (expires_at);
        CREATE INDEX IF NOT EXISTS auth_session_revoked_at_idx ON auth_session (revoked_at);
    `);
    console.log('[Migration] auth_session table verified.');
    process.exit(0);
}

migrate().catch((err) => {
    console.error('[Migration Error]:', err);
    process.exit(1);
});
