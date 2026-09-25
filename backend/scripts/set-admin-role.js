import { database, closeDatabaseConnection } from '../src/database/client.js';
async function main() {
    const args = process.argv.slice(2);
    const email = (args[0] || 'admin@newuniquecomputers.com').trim().toLowerCase();
    console.log(`Setting ADMIN role for: ${email}...`);
    try {
        const existing = await database.execute(`SELECT id, email, raw_app_meta_data FROM auth.users WHERE LOWER(email) = '${email}';`);
        if (existing.rows.length === 0) {
            console.log(`\n⚠️ User '${email}' not found in Supabase Auth yet.`);
            console.log('Please add the user first in Supabase Dashboard -> Authentication -> Users -> Add User (Create user with Auto Confirm checked).');
            console.log('Then run this script again.\n');
            return;
        }
        const userId = existing.rows[0]?.id;
        await database.execute(`
      UPDATE auth.users 
      SET 
        raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "ADMIN"}'::jsonb,
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        updated_at = NOW()
      WHERE id = '${userId}';
    `);
        console.log(`\n🎉 SUCCESS! User '${email}' is now an authenticated ADMIN!`);
        console.log('You can now log in at http://localhost:5173\n');
    }
    catch (err) {
        console.error('Error:', err.message);
    }
    finally {
        await closeDatabaseConnection();
    }
}
main().catch(console.error);
