import { database } from '../client.js';
import { sql } from 'drizzle-orm';

async function migrate() {
    await database.execute(sql`
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
    console.log('[Migration] auth_sessions table verified with RLS enabled.');
    process.exit(0);
}

migrate().catch((err) => {
    console.error(err);
    process.exit(1);
});
