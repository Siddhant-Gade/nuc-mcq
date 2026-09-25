export async function up(database) {
    await database.execute(`
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
}
export async function down(database) {
    await database.execute(`DROP TABLE IF EXISTS teacher;`);
}
