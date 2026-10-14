import { database } from '../client.js';
import { sql } from 'drizzle-orm';

async function migrate() {
    await database.execute(sql`
        CREATE TABLE IF NOT EXISTS broadcast_read (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            broadcast_id UUID NOT NULL REFERENCES broadcast(id) ON DELETE CASCADE,
            auth_user_id UUID NOT NULL,
            read_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE UNIQUE INDEX IF NOT EXISTS broadcast_read_user_broadcast_idx ON broadcast_read (auth_user_id, broadcast_id);
        CREATE INDEX IF NOT EXISTS broadcast_read_user_idx ON broadcast_read (auth_user_id);
    `);
    console.log('[Migration] broadcast_read table verified.');
    process.exit(0);
}

migrate().catch((err) => {
    console.error(err);
    process.exit(1);
});
