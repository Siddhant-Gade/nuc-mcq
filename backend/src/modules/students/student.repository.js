import { asc, desc, eq, sql } from 'drizzle-orm';
import { authorizationRequests, batches, studentAccess, studentProfiles, testResults } from '../../database/schema/index.js';
export class DrizzleStudentRepository {
    database;
    constructor(database) {
        this.database = database;
    }
    async list() {
        const rows = await this.database
            .select({ student: studentProfiles, accessStatus: studentAccess.status })
            .from(studentProfiles)
            .leftJoin(studentAccess, eq(studentAccess.studentProfileId, studentProfiles.id))
            .orderBy(asc(studentProfiles.createdAt));
        return rows.map(({ student, accessStatus }) => ({
            ...student,
            accessStatus: accessStatus ?? 'PENDING',
        }));
    }
    async findById(id) {
        const [student] = await this.database.select().from(studentProfiles).where(eq(studentProfiles.id, id)).limit(1);
        return student;
    }
    async findByAuthUserId(authUserId) {
        const rows = await this.database
            .select({
                profile: studentProfiles,
                access: studentAccess,
                batchName: batches.batchName,
            })
            .from(studentAccess)
            .innerJoin(studentProfiles, eq(studentProfiles.id, studentAccess.studentProfileId))
            .leftJoin(batches, eq(batches.batchId, studentProfiles.batchId))
            .where(eq(studentAccess.authUserId, authUserId))
            .limit(1);
        if (rows[0]) {
            return {
                profile: rows[0].profile,
                access: rows[0].access,
                batchName: rows[0].batchName ?? null,
            };
        }
        // Automatic fallback & self-healing: if student_access.auth_user_id wasn't linked yet,
        // look up auth.users to resolve by email or PRN in metadata.
        try {
            const authUserRes = await this.database.execute(sql `
        SELECT email, raw_user_meta_data FROM auth.users WHERE id = ${authUserId}::uuid LIMIT 1;
      `);
            const authUser = authUserRes.rows[0];
            if (authUser) {
                const prn = authUser.raw_user_meta_data?.prn;
                let matched;
                if (prn) {
                    matched = await this.findByStudentId(prn);
                }
                if (!matched && authUser.email) {
                    matched = await this.findByEmail(authUser.email);
                }
                if (matched) {
                    await this.database
                        .update(studentAccess)
                        .set({ authUserId, updatedAt: new Date() })
                        .where(eq(studentAccess.studentProfileId, matched.profile.id));
                    matched.access.authUserId = authUserId;
                    return matched;
                }
            }
        }
        catch { }
        return undefined;
    }
    async findByEmail(email) {
        if (email.toLowerCase().endsWith('@student.unique')) {
            const prn = email.toLowerCase().replace('@student.unique', '');
            const byPrn = await this.findByStudentId(prn);
            if (byPrn)
                return byPrn;
        }
        const rows = await this.database
            .select({
                profile: studentProfiles,
                access: studentAccess,
                batchName: batches.batchName,
            })
            .from(studentAccess)
            .innerJoin(studentProfiles, eq(studentProfiles.id, studentAccess.studentProfileId))
            .leftJoin(batches, eq(batches.batchId, studentProfiles.batchId))
            .where(sql `LOWER(${studentProfiles.email}) = LOWER(${email})`)
            .limit(1);
        if (rows[0]) {
            return {
                profile: rows[0].profile,
                access: rows[0].access,
                batchName: rows[0].batchName ?? null,
            };
        }
        return undefined;
    }
    async findByStudentId(studentId) {
        const rows = await this.database
            .select({
                profile: studentProfiles,
                access: studentAccess,
                batchName: batches.batchName,
            })
            .from(studentAccess)
            .innerJoin(studentProfiles, eq(studentProfiles.id, studentAccess.studentProfileId))
            .leftJoin(batches, eq(batches.batchId, studentProfiles.batchId))
            .where(sql `LOWER(${studentProfiles.studentId}) = LOWER(${studentId})`)
            .limit(1);
        if (rows[0]) {
            return {
                profile: rows[0].profile,
                access: rows[0].access,
                batchName: rows[0].batchName ?? null,
            };
        }
        return undefined;
    }
    async findAccessByStudentId(studentProfileId) {
        const [access] = await this.database
            .select()
            .from(studentAccess)
            .where(eq(studentAccess.studentProfileId, studentProfileId))
            .limit(1);
        return access;
    }
    async create(input) {
        return this.database.transaction(async (transaction) => {
            const [student] = await transaction.insert(studentProfiles).values(input).returning();
            if (student === undefined) {
                throw new Error('Student insert did not return a record.');
            }
            let authUserId = null;
            if (student.email) {
                try {
                    const authRows = await transaction.execute(sql `SELECT id FROM auth.users WHERE LOWER(email) = LOWER(${student.email}) LIMIT 1`);
                    if (authRows.rows.length > 0 && authRows.rows[0]?.id) {
                        authUserId = authRows.rows[0].id;
                    }
                }
                catch {
                    // Ignore if auth.users schema is not present in mock/test DB
                }
            }
            const [access] = await transaction
                .insert(studentAccess)
                .values({
                studentProfileId: student.id,
                status: 'PENDING',
                ...(authUserId ? { authUserId } : {}),
            })
                .returning();
            if (access === undefined) {
                throw new Error('Student access insert did not return a record.');
            }
            return { ...student, accessStatus: access.status };
        });
    }
    async update(id, input) {
        const [student] = await this.database
            .update(studentProfiles)
            .set({ ...input, updatedAt: new Date() })
            .where(eq(studentProfiles.id, id))
            .returning();
        return student;
    }
    async updateAccessStatus(id, status, metadata = {}) {
        const now = new Date();
        if (status === 'ACTIVE') {
            const [access] = await this.database
                .update(studentAccess)
                .set({
                    status,
                    accessGrantedAt: now,
                    suspendedAt: null,
                    suspendedBy: null,
                    suspensionReason: null,
                    updatedAt: now,
                })
                .where(eq(studentAccess.studentProfileId, id))
                .returning();
            if (access) {
                // 1. Mark any PENDING authorization request as APPROVED
                try {
                    await this.database
                        .update(authorizationRequests)
                        .set({ status: 'APPROVED', reviewedAt: now, reviewedBy: null })
                        .where(eq(authorizationRequests.studentProfileId, id));
                }
                catch { }
                // 2. Link auth_user_id if not linked, and ensure auth.users has STUDENT role
                try {
                    const student = await this.findById(id);
                    if (student) {
                        const prn = student.studentId;
                        const authEmail = `${prn.toLowerCase().replace(/[^a-z0-9_.-]/g, '')}@student.unique`;
                        const profileEmail = student.email?.toLowerCase();
                        const authUserRes = await this.database.execute(sql `
              SELECT id FROM auth.users 
              WHERE LOWER(email) = LOWER(${authEmail}) OR (LOWER(email) = LOWER(${profileEmail}) AND ${profileEmail} IS NOT NULL)
              LIMIT 1;
            `);
                        const firstRow = authUserRes.rows[0];
                        const userId = access.authUserId ?? firstRow?.id;
                        if (userId) {
                            if (!access.authUserId) {
                                await this.database
                                    .update(studentAccess)
                                    .set({ authUserId: userId, updatedAt: now })
                                    .where(eq(studentAccess.studentProfileId, id));
                                access.authUserId = userId;
                            }
                            await this.database.execute(sql `
                UPDATE auth.users
                SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "STUDENT"}'::jsonb
                WHERE id = ${userId}::uuid;
              `);
                        }
                    }
                }
                catch { }
            }
            return access;
        }
        if (status === 'SUSPENDED') {
            const [access] = await this.database
                .update(studentAccess)
                .set({
                    status: 'SUSPENDED',
                    suspendedAt: now,
                    suspendedBy: metadata.suspendedBy ?? null,
                    suspensionReason: metadata.reason ?? null,
                    updatedAt: now,
                })
                .where(eq(studentAccess.studentProfileId, id))
                .returning();
            // Synchronize authorization_request -> REJECTED
            try {
                await this.database
                    .update(authorizationRequests)
                    .set({ status: 'REJECTED', reviewedAt: now, reviewedBy: metadata.suspendedBy ?? null })
                    .where(eq(authorizationRequests.studentProfileId, id));
            } catch { }
            if (access?.authUserId) {
                try {
                    await this.database.execute(sql`
                        UPDATE auth.users
                        SET raw_app_meta_data = (raw_app_meta_data - 'role')
                        WHERE id = ${access.authUserId}::uuid;
                    `);
                } catch { }
            }
            return access;
        }
        if (status === 'REVOKED') {
            const [access] = await this.database
                .update(studentAccess)
                .set({ status, revokedAt: now, updatedAt: now })
                .where(eq(studentAccess.studentProfileId, id))
                .returning();
            // Synchronize authorization_request -> REJECTED
            try {
                await this.database
                    .update(authorizationRequests)
                    .set({ status: 'REJECTED', reviewedAt: now, reviewedBy: null })
                    .where(eq(authorizationRequests.studentProfileId, id));
            } catch { }
            if (access?.authUserId) {
                try {
                    await this.database.execute(sql`
                        UPDATE auth.users
                        SET raw_app_meta_data = (raw_app_meta_data - 'role')
                        WHERE id = ${access.authUserId}::uuid;
                    `);
                } catch { }
            }
            return access;
        }
        if (status === 'PENDING') {
            const [access] = await this.database
                .update(studentAccess)
                .set({ status, accessGrantedAt: null, revokedAt: null, updatedAt: now })
                .where(eq(studentAccess.studentProfileId, id))
                .returning();
            // Synchronize existing authorization_request -> PENDING if one exists
            try {
                const existing = await this.database
                    .select({ id: authorizationRequests.id })
                    .from(authorizationRequests)
                    .where(eq(authorizationRequests.studentProfileId, id))
                    .limit(1);
                if (existing.length > 0) {
                    await this.database
                        .update(authorizationRequests)
                        .set({ status: 'PENDING', reviewedAt: null, reviewedBy: null, requestedAt: now })
                        .where(eq(authorizationRequests.studentProfileId, id));
                }
            } catch { }
            if (access?.authUserId) {
                try {
                    await this.database.execute(sql`
                        UPDATE auth.users
                        SET raw_app_meta_data = (raw_app_meta_data - 'role')
                        WHERE id = ${access.authUserId}::uuid;
                    `);
                } catch { }
            }
            return access;
        }
        const [access] = await this.database
            .update(studentAccess)
            .set({ status, updatedAt: now })
            .where(eq(studentAccess.studentProfileId, id))
            .returning();
        return access;
    }
    async delete(id) {
        return this.database.transaction(async (tx) => {
            const [student] = await tx.select().from(studentProfiles).where(eq(studentProfiles.id, id)).limit(1);
            if (!student) {
                return false;
            }
            const [access] = await tx.select().from(studentAccess).where(eq(studentAccess.studentProfileId, id)).limit(1);
            const deletedRows = await tx
                .delete(studentProfiles)
                .where(eq(studentProfiles.id, id))
                .returning({ id: studentProfiles.id });
            try {
                if (access?.authUserId) {
                    await tx.execute(sql `DELETE FROM auth.users WHERE id = ${access.authUserId}`);
                }
                else if (student.email) {
                    await tx.execute(sql `DELETE FROM auth.users WHERE LOWER(email) = LOWER(${student.email})`);
                }
            }
            catch {
                // Continue gracefully if auth.users is inaccessible or not present
            }
            return deletedRows.length > 0;
        });
    }
    async registerStudentAuth(prnOrEmail, password) {
        const trimmed = prnOrEmail.trim();
        const student = (await this.findByStudentId(trimmed)) ?? (await this.findByEmail(trimmed));
        if (!student) {
            throw new Error(`STUDENT_NOT_FOUND: No student admitted with PRN or Email "${trimmed}".`);
        }
        const prn = student.profile.studentId;
        const authEmail = `${prn.toLowerCase().replace(/[^a-z0-9_.-]/g, '')}@student.unique`;
        const profileEmail = student.profile.email?.trim().toLowerCase();
        const upsertAuthUser = async (targetEmail) => {
            try {
                const existing = await this.database.execute(sql `
          SELECT id FROM auth.users WHERE LOWER(email) = LOWER(${targetEmail}) LIMIT 1;
        `);
                const firstRow = existing.rows[0];
                if (firstRow?.id) {
                    const userId = firstRow.id;
                    await this.database.execute(sql `
            UPDATE auth.users
            SET encrypted_password = crypt(${password}, gen_salt('bf')),
                email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
                confirmation_token = COALESCE(confirmation_token, ''),
                recovery_token = COALESCE(recovery_token, ''),
                email_change_token_new = COALESCE(email_change_token_new, ''),
                email_change = COALESCE(email_change, ''),
                is_super_admin = COALESCE(is_super_admin, false),
                raw_user_meta_data = jsonb_build_object('prn', ${prn}::text, 'name', ${student.profile.name}::text),
                raw_app_meta_data = '{"provider": "email", "providers": ["email"]}'::jsonb,
                updated_at = NOW()
            WHERE id = ${userId}::uuid;
          `);
                    await this.database.execute(sql `
            INSERT INTO auth.identities (
              id,
              user_id,
              identity_data,
              provider,
              provider_id,
              last_sign_in_at,
              created_at,
              updated_at
            ) VALUES (
              gen_random_uuid(),
              ${userId}::uuid,
              jsonb_build_object('sub', ${userId}::text, 'email', ${targetEmail}::text, 'email_verified', true),
              'email',
              ${userId}::text,
              NOW(),
              NOW(),
              NOW()
            )
            ON CONFLICT (provider_id, provider) DO UPDATE
            SET identity_data = EXCLUDED.identity_data, updated_at = NOW();
          `);
                    return userId;
                }
                else {
                    const insertRes = await this.database.execute(sql `
            INSERT INTO auth.users (
              id,
              instance_id,
              aud,
              role,
              email,
              encrypted_password,
              email_confirmed_at,
              confirmation_token,
              recovery_token,
              email_change_token_new,
              email_change,
              is_super_admin,
              raw_app_meta_data,
              raw_user_meta_data,
              is_sso_user,
              created_at,
              updated_at
            ) VALUES (
              gen_random_uuid(),
              '00000000-0000-0000-0000-000000000000',
              'authenticated',
              'authenticated',
              ${targetEmail},
              crypt(${password}, gen_salt('bf')),
              NOW(),
              '',
              '',
              '',
              '',
              false,
              '{"provider": "email", "providers": ["email"]}'::jsonb,
              jsonb_build_object('prn', ${prn}::text, 'name', ${student.profile.name}::text),
              false,
              NOW(),
              NOW()
            ) RETURNING id;
          `);
                    const newUserId = insertRes.rows[0]?.id;
                    if (newUserId) {
                        await this.database.execute(sql `
              INSERT INTO auth.identities (
                id,
                user_id,
                identity_data,
                provider,
                provider_id,
                last_sign_in_at,
                created_at,
                updated_at
              ) VALUES (
                gen_random_uuid(),
                ${newUserId}::uuid,
                jsonb_build_object('sub', ${newUserId}::text, 'email', ${targetEmail}::text, 'email_verified', true),
                'email',
                ${newUserId}::text,
                NOW(),
                NOW(),
                NOW()
              )
              ON CONFLICT (provider_id, provider) DO UPDATE
              SET identity_data = EXCLUDED.identity_data, updated_at = NOW();
            `);
                    }
                    return newUserId;
                }
            }
            catch (err) {
                console.error(`Failed to upsert auth.users/identities for ${targetEmail}:`, err);
                throw err;
            }
        };
        const authUserId = await upsertAuthUser(authEmail);
        if (profileEmail && profileEmail !== authEmail) {
            try {
                await upsertAuthUser(profileEmail);
            }
            catch (profileErr) {
                console.warn(`Could not sync profile email ${profileEmail}:`, profileErr);
            }
        }
        if (authUserId) {
            try {
                // Link auth_user_id without overriding PENDING status
                await this.database.execute(sql `
          UPDATE student_access
          SET auth_user_id = ${authUserId}::uuid, updated_at = NOW()
          WHERE student_profile_id = ${student.profile.id}::uuid;
        `);
                student.access.authUserId = authUserId;
            }
            catch (accessErr) {
                console.error('Failed to update student_access:', accessErr);
            }
        }
        return { ...student, authEmail };
    }
    async getPerformance(studentProfileId) {
        const results = await this.database
            .select()
            .from(testResults)
            .where(eq(testResults.studentProfileId, studentProfileId))
            .orderBy(desc(testResults.completedAt));

        const totalTests = results.length;
        if (totalTests === 0) {
            return {
                totalTests: 0,
                practiceCount: 0,
                examCount: 0,
                avgPercentage: 0,
                passedCount: 0,
                recentTests: [],
            };
        }

        const practiceCount = results.filter((r) => r.mode === 'PRACTICE').length;
        const examCount = results.filter((r) => r.mode === 'EXAM').length;
        const totalScoreFrac = results.reduce((acc, r) => acc + (r.score / (r.totalQuestions || 1)), 0);
        const avgPercentage = Math.round((totalScoreFrac / totalTests) * 100);
        const passedCount = results.filter((r) => (r.score / (r.totalQuestions || 1)) >= 0.4).length;

        return {
            totalTests,
            practiceCount,
            examCount,
            avgPercentage,
            passedCount,
            recentTests: results.slice(0, 3).map((r) => ({
                id: r.id,
                mode: r.mode,
                score: r.score,
                totalQuestions: r.totalQuestions,
                percentage: Math.round((r.score / (r.totalQuestions || 1)) * 100),
                passed: (r.score / (r.totalQuestions || 1)) >= 0.4,
                completedAt: r.completedAt,
            })),
        };
    }
}
