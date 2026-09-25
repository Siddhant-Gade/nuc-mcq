export async function up(database) {
    await database.execute(`
        ALTER TABLE batch ADD COLUMN IF NOT EXISTS timing VARCHAR(100);
        ALTER TABLE batch ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES teacher(id) ON DELETE SET NULL;
    `);
}
export async function down(database) {
    await database.execute(`
        ALTER TABLE batch DROP COLUMN IF EXISTS teacher_id;
        ALTER TABLE batch DROP COLUMN IF EXISTS timing;
    `);
}
