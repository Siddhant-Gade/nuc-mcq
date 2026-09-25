import { database, closeDatabaseConnection } from '../src/database/client.js';
import { sql } from 'drizzle-orm';
async function main() {
    console.log('--- STARTING SYSTEM INTEGRITY VERIFICATION ---');
    let passed = 0;
    let failed = 0;
    // 1. Health check
    try {
        const healthRes = await fetch('http://127.0.0.1:3000/health');
        const healthJson = await healthRes.json();
        if (healthRes.status === 200 && healthJson.data?.status === 'healthy') {
            console.log('✓ 1. Backend Health Check: HEALTHY (200)');
            passed++;
        }
        else {
            console.error('✗ 1. Backend Health Check failed:', healthRes.status, healthJson);
            failed++;
        }
    }
    catch (err) {
        console.error('✗ 1. Backend Health Check failed to connect:', err);
        failed++;
    }
    // 2. PRN Resolution (Existing Student)
    try {
        const res = await fetch('http://127.0.0.1:3000/api/v1/auth/resolve-identifier', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: 'PRN2026945779' }),
        });
        const json = await res.json();
        if (res.status === 200 && json.data?.name === 'Siddhant' && json.data?.studentId === 'PRN2026945779') {
            console.log(`✓ 2. PRN Resolution: SUCCESS - Found ${json.data.name} (${json.data.studentId}), Status: ${json.data.status}`);
            passed++;
        }
        else {
            console.error('✗ 2. PRN Resolution failed:', res.status, json);
            failed++;
        }
    }
    catch (err) {
        console.error('✗ 2. PRN Resolution error:', err);
        failed++;
    }
    // 3. PRN Resolution (Non-admitted Student)
    try {
        const res = await fetch('http://127.0.0.1:3000/api/v1/auth/resolve-identifier', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: 'PRN9999999999' }),
        });
        if (res.status === 404) {
            console.log('✓ 3. PRN Negative Resolution: Correctly rejected non-existent PRN with 404');
            passed++;
        }
        else {
            console.error('✗ 3. PRN Negative Resolution unexpected status:', res.status);
            failed++;
        }
    }
    catch (err) {
        console.error('✗ 3. PRN Negative Resolution error:', err);
        failed++;
    }
    // 4. Custom Password Sync & Auto-Activation
  try {
    const res = await fetch('http://127.0.0.1:3000/api/v1/auth/student-register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prn: 'PRN2026945779', password: 'TestPassword@123' }),
    });
    const json = await res.json();
    if (res.status === 200 && json.success && json.data?.name === 'Siddhant') {
      console.log(`✓ 4. Student Custom Password & Auto-Activation: SUCCESS - ${json.data.message}`);
      passed++;
    } else {
      console.error('✗ 4. Student Register failed:', res.status, json);
      failed++;
    }
  } catch (err) {
    console.error('✗ 4. Student Register error:', err);
    failed++;
  }

  // 5. Database check: Verify student_access and auth.users roles
  try {
    const check = await database.execute(sql`
      SELECT sp.name, sp.student_id, sa.status as access_status, sa.auth_user_id, u.email as auth_email
      FROM student_profile sp
      JOIN student_access sa ON sa.student_profile_id = sp.id
      LEFT JOIN auth.users u ON u.id = sa.auth_user_id
      WHERE sp.student_id = 'PRN2026945779'
      LIMIT 1;
    `);
    const row = check.rows[0];
    if (row && row.access_status === 'ACTIVE' && row.auth_user_id) {
      console.log(`✓ 5. PostgreSQL & Supabase Auth Linkage: LINKED - Student ID: ${row.student_id}, Access: ${row.access_status}, Auth User: ${row.auth_user_id}`);
      passed++;
    } else {
      console.error('✗ 5. Database Linkage check failed:', row);
      failed++;
    }
  } catch (err) {
    console.error('✗ 5. Database Linkage check error:', err);
    failed++;
  }

  // 6. Question Bank Content Check
  try {
    const questionsRes = await database.execute(sql`
      SELECT count(*) as count FROM question;
    `);
    const count = parseInt(questionsRes.rows[0].count, 10);
    console.log(`✓ 6. Question Bank Content: Verified ${count} questions stored in database.`);
    passed++;
  } catch (err) {
    console.error('✗ 6. Question Bank Check error:', err);
    failed++;
  }
    console.log(`\n--- VERIFICATION RESULT: ${passed} OF ${passed + failed} CHECKS PASSED ---`);
    await closeDatabaseConnection();
    if (failed > 0)
        process.exit(1);
}
main().catch(err => {
    console.error(err);
    process.exit(1);
});
