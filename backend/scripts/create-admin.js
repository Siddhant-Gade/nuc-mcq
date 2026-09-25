import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import { database, closeDatabaseConnection } from '../src/database/client.js';
dotenv.config({ path: './.env' });
async function main() {
    const args = process.argv.slice(2);
    const email = (args[0] || 'admin@gmail.com').trim().toLowerCase();
    const password = args[1] || 'Admin@123456';
    const adminEnv = fs.readFileSync('../admin/.env', 'utf-8');
    let supabaseUrl = '';
    let supabaseKey = '';
    for (const line of adminEnv.split('\n')) {
        if (line.startsWith('VITE_SUPABASE_URL='))
            supabaseUrl = line.split('=')[1]?.trim() || '';
        if (line.startsWith('VITE_SUPABASE_PUBLIC_KEY='))
            supabaseKey = line.split('=')[1]?.trim() || '';
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log(`Setting up Admin account for: ${email}...`);
    try {
        const broadcasts = await database.execute(`SELECT * FROM broadcast;`);
        const targets = await database.execute(`SELECT * FROM broadcast_target;`);
        console.log('BROADCASTS IN DB:', broadcasts.rows);
        console.log('BROADCAST TARGETS IN DB:', targets.rows);
        // 2. Sign up cleanly via Supabase Auth API
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
            email,
            password,
        });
        if (signUpErr) {
            console.error('Supabase SignUp Error:', signUpErr);
            return;
        }
        const userId = signUpData.user?.id;
        console.log('✅ Created user in Supabase Auth, User ID:', userId);
        // 3. Confirm email and grant ADMIN role directly in PostgreSQL
        await database.execute(`
      UPDATE auth.users 
      SET 
        email_confirmed_at = NOW(),
        raw_app_meta_data = raw_app_meta_data || '{"role": "ADMIN"}'::jsonb,
        updated_at = NOW()
      WHERE email = '${email}';
    `);
        console.log('✅ Granted verified ADMIN role and confirmed email in PostgreSQL.');
        // 4. Test sign in with password
        console.log('Verifying signInWithPassword:');
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (signInErr) {
            console.error('❌ Sign-in test failed:', signInErr.message);
        }
        else {
            console.log('🎉 SUCCESS! Signed in cleanly via Supabase Auth!');
            console.log('User ID:', signInData.user?.id);
            console.log('Verified Roles:', signInData.user?.app_metadata?.role);
            console.log('\n==================================');
            console.log('ADMIN LOGIN CREDENTIALS:');
            console.log(`Email:    ${email}`);
            console.log(`Password: ${password}`);
            console.log('Role:     ADMIN');
            console.log('==================================\n');
        }
    }
    catch (err) {
        console.error('Error:', err.message);
    }
    finally {
        await closeDatabaseConnection();
    }
}
main().catch(console.error);
