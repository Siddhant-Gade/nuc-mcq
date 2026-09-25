import { database } from '../client.js';
import { sql } from 'drizzle-orm';

async function migrate() {
    await database.execute(sql`
        CREATE TABLE IF NOT EXISTS student_device_token (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            auth_user_id UUID NOT NULL,
            fcm_token VARCHAR(512) NOT NULL UNIQUE,
            device_platform VARCHAR(20) NOT NULL DEFAULT 'android',
            last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS device_token_auth_user_idx ON student_device_token (auth_user_id);
        CREATE INDEX IF NOT EXISTS device_token_fcm_token_idx ON student_device_token (fcm_token);
    `);
    console.log('[Migration] student_device_token table verified.');
    process.exit(0);
}

migrate().catch((err) => {
    console.error(err);
    process.exit(1);
});
