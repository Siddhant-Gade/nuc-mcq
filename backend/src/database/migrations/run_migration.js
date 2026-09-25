import { database } from '../client.js';
import { sql } from 'drizzle-orm';

async function migrate() {
    console.log('[Migration] Running teacher table creation...');
    await database.execute(sql`
        CREATE TABLE IF NOT EXISTS teacher (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(200) NOT NULL,
            email VARCHAR(320) NOT NULL UNIQUE,
            mobile VARCHAR(30),
            subject VARCHAR(200),
            institute_id VARCHAR(100) NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
        );
    `);
    console.log('[Migration] Teacher table verified.');

    console.log('[Migration] Adding timing and teacher_id to batch table...');
    await database.execute(sql`
        ALTER TABLE batch ADD COLUMN IF NOT EXISTS timing VARCHAR(100);
        ALTER TABLE batch ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES teacher(id) ON DELETE SET NULL;
    `);
    console.log('[Migration] Batch columns verified.');

    console.log('[Migration] Adding PPT and PPTX to document_file_type enum...');
    await database.execute(sql`
        ALTER TYPE document_file_type ADD VALUE IF NOT EXISTS 'PPT';
        ALTER TYPE document_file_type ADD VALUE IF NOT EXISTS 'PPTX';
    `);
    console.log('[Migration] document_file_type enum updated.');
    process.exit(0);
}

migrate().catch((err) => {
    console.error('[Migration Error]:', err);
    process.exit(1);
});
