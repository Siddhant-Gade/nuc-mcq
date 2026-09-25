import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import test from 'node:test';
import { eq } from 'drizzle-orm';
import { closeDatabaseConnection, database } from './client.js';
import * as schema from './schema/index.js';
import { notifications, studyMaterials } from './schema/index.js';
import { DrizzleStudentRepository } from '../modules/students/student.repository.js';
import { DrizzleResultRepository } from '../modules/results/result.repository.js';
import { DrizzleBroadcastRepository } from '../modules/broadcasts/broadcast.repository.js';
import { DrizzleNotificationRepository } from '../modules/notifications/notification.repository.js';
import { DrizzleAuthorizationRequestRepository } from '../modules/authorization/authorization.repository.js';
import { hasPostgresErrorCode, isUniqueViolation } from '../utils/db-errors.js';
/**
 * Phase 16 database-adapter tests: exercise the REAL Drizzle repositories
 * against the configured PostgreSQL (Supabase) so constraints, transactions,
 * and conditional updates are proven, not assumed.
 *
 * These tests are opt-in because they touch the live database:
 *   $env:RUN_DB_TESTS='1'; npm test        (PowerShell)
 *   RUN_DB_TESTS=1 npm test                (bash)
 *
 * Every fixture is namespaced and removed afterwards; deleting a student
 * profile cascades to its access row, results, and authorization requests.
 */
const shouldRun = process.env.RUN_DB_TESTS === '1' && !!process.env.DATABASE_URL;
const skipOptions = shouldRun ? {} : { skip: 'Set RUN_DB_TESTS=1 to run live-database adapter tests' };
const students = new DrizzleStudentRepository(database);
const results = new DrizzleResultRepository(database);
const broadcastsRepo = new DrizzleBroadcastRepository(database);
const notificationsRepo = new DrizzleNotificationRepository(database);
const authRequests = new DrizzleAuthorizationRequestRepository(database);
const runSuffix = randomUUID().slice(0, 8);
async function createStudentFixture() {
    const studentId = `TEST-${runSuffix}-${randomUUID().slice(0, 8)}`;
    const created = await students.create({
        studentId,
        name: 'Phase16 Adapter Fixture',
        instituteId: 'TEST-INST',
        batchId: 'TEST-BATCH',
    });
    return { profileId: created.id, studentId, authUserId: randomUUID() };
}
async function cleanupStudent(fixture) {
    await database.delete(schema.studentProfiles).where(eq(schema.studentProfiles.id, fixture.profileId));
}
test('student adapter: create makes a PENDING access row and transitions stamp timestamps', skipOptions, async () => {
    const fixture = await createStudentFixture();
    try {
        const accessBefore = await students.findAccessByStudentId(fixture.profileId);
        assert.ok(accessBefore);
        assert.equal(accessBefore.status, 'PENDING');
        assert.equal(accessBefore.accessGrantedAt, null);
        // Duplicate student IDs must collide with the unique constraint.
        await assert.rejects(students.create({
            studentId: fixture.studentId,
            name: 'Duplicate',
            instituteId: 'TEST-INST',
            batchId: 'TEST-BATCH',
        }));
        const activated = await students.updateAccessStatus(fixture.profileId, 'ACTIVE');
        assert.ok(activated);
        assert.equal(activated.status, 'ACTIVE');
        assert.ok(activated.accessGrantedAt instanceof Date);
        // Linking the identity makes findByAuthUserId resolve.
        await database
            .update(schema.studentAccess)
            .set({ authUserId: fixture.authUserId })
            .where(eq(schema.studentAccess.studentProfileId, fixture.profileId));
        const resolved = await students.findByAuthUserId(fixture.authUserId);
        assert.ok(resolved);
        assert.equal(resolved.profile.id, fixture.profileId);
        assert.equal(resolved.access.status, 'ACTIVE');
    }
    finally {
        await cleanupStudent(fixture);
    }
});
test('result adapter: UNIQUE(client_event_id) rejects duplicates at the database level', skipOptions, async () => {
    const fixture = await createStudentFixture();
    try {
        const clientEventId = randomUUID();
        const base = {
            clientEventId,
            studentProfileId: fixture.profileId,
            authUserId: fixture.authUserId,
            testId: 'TEST-EXAM',
            mode: 'EXAM',
            questionBankVersion: null,
            blueprintVersion: null,
            totalQuestions: 25,
            correctCount: 20,
            wrongCount: 5,
            score: 80,
            wrongQuestionIds: ['Q1', 'Q2', 'Q3', 'Q4', 'Q5'],
            completedAt: new Date(),
        };
        const inserted = await results.insert(base);
        assert.equal(inserted.clientEventId, clientEventId);
        await assert.rejects(results.insert({ ...base, wrongQuestionIds: [] }), (error) => {
            // drizzle-orm wraps driver errors, so check the cause chain too.
            assert.equal(isUniqueViolation(error), true);
            return true;
        });
        const stored = await results.findByClientEventId(clientEventId);
        assert.ok(stored);
        assert.deepEqual(stored.wrongQuestionIds, ['Q1', 'Q2', 'Q3', 'Q4', 'Q5']);
        // Deleting the student cascades the result away.
        await cleanupStudent(fixture);
        assert.equal(await results.findByClientEventId(clientEventId), undefined);
    }
    finally {
        await cleanupStudent(fixture);
    }
});
test('broadcast adapter: targets persist, publish is one-way, deletion cascades targets', skipOptions, async () => {
    const batchId = `TEST-BATCH-${runSuffix}`;
    await database.insert(schema.batches).values({
        batchId,
        batchName: 'Phase16 Broadcast Fixture',
        instituteId: 'TEST-INST',
        capacity: 5,
    });
    try {
        const inserted = await broadcastsRepo.insert({
            title: 'Adapter notice',
            message: 'Body',
            audienceType: 'BATCH',
            status: 'DRAFT',
            publishedAt: null,
            createdBy: randomUUID(),
        }, [batchId]);
        try {
            const fetched = await broadcastsRepo.getById(inserted.id);
            assert.deepEqual(fetched?.targetBatchIds, [batchId]);
            const publishedAt = await broadcastsRepo.markPublished(inserted.id);
            assert.ok(publishedAt instanceof Date);
            // The one-way guard: a second transition matches no DRAFT row.
            assert.equal(await broadcastsRepo.markPublished(inserted.id), undefined);
            const replaced = await broadcastsRepo.update(inserted.id, { title: 'Edited' }, []);
            assert.equal(replaced?.title, 'Edited');
            assert.deepEqual(replaced?.targetBatchIds, []);
            const removed = await broadcastsRepo.removeById(inserted.id);
            assert.equal(removed, true);
            assert.equal(await broadcastsRepo.getById(inserted.id), undefined);
        }
        finally {
            if (await broadcastsRepo.existsById(inserted.id)) {
                await broadcastsRepo.removeById(inserted.id);
            }
        }
    }
    finally {
        await database.delete(schema.batches).where(eq(schema.batches.batchId, batchId));
    }
});
test('notification adapter: unread counts and ownership-guarded mark-read', skipOptions, async () => {
    const recipient = randomUUID();
    const foreignRecipient = randomUUID();
    const own = await notificationsRepo.insert({
        recipientAuthUserId: recipient,
        title: 'Own notice',
        message: 'Body',
        type: 'system',
        relatedRoute: null,
        isRead: false,
        readAt: null,
    });
    await notificationsRepo.insert({
        recipientAuthUserId: recipient,
        title: 'Own 2',
        message: 'Body',
        type: 'announcement',
        relatedRoute: null,
        isRead: false,
        readAt: null,
    });
    const foreign = await notificationsRepo.insert({
        recipientAuthUserId: foreignRecipient,
        title: 'Foreign notice',
        message: 'Body',
        type: 'system',
        relatedRoute: null,
        isRead: false,
        readAt: null,
    });
    try {
        assert.equal(await notificationsRepo.countUnread(recipient), 2);
        // Ownership lives in the UPDATE's WHERE clause.
        assert.equal(await notificationsRepo.markRead(foreign.id, recipient), undefined);
        const marked = await notificationsRepo.markRead(own.id, recipient);
        assert.ok(marked?.isRead);
        assert.ok(marked.readAt instanceof Date);
        const updatedCount = await notificationsRepo.markAllRead(recipient);
        assert.equal(updatedCount, 1); // only the still-unread row
        assert.equal(await notificationsRepo.countUnread(recipient), 0);
        assert.equal(await notificationsRepo.countUnread(foreignRecipient), 1);
    }
    finally {
        await database.delete(notifications).where(eq(notifications.recipientAuthUserId, recipient));
        await database.delete(notifications).where(eq(notifications.recipientAuthUserId, foreignRecipient));
    }
});
test('authorization adapter: approval transactionally activates access; re-review is blocked', skipOptions, async () => {
    const fixture = await createStudentFixture();
    try {
        const request = await authRequests.create(fixture.profileId, fixture.authUserId);
        assert.equal(request.status, 'PENDING');
        const approval = await authRequests.approve(request.id, randomUUID());
        assert.ok(approval);
        assert.equal(approval.record.status, 'APPROVED');
        assert.equal(approval.accessUpdated, true);
        const access = await students.findAccessByStudentId(fixture.profileId);
        assert.equal(access?.status, 'ACTIVE');
        assert.equal(access?.authUserId, fixture.authUserId);
        assert.ok(access?.accessGrantedAt instanceof Date);
        // Status guard: an already-approved request cannot be reviewed again.
        assert.equal(await authRequests.approve(request.id, randomUUID()), undefined);
        assert.equal(await authRequests.reject(request.id, randomUUID()), undefined);
        // findPendingByAuthUserId no longer sees it after review.
        assert.equal(await authRequests.findPendingByAuthUserId(fixture.authUserId), undefined);
    }
    finally {
        await cleanupStudent(fixture);
    }
});
test('study-material adapter: kind-field CHECKs, 5 MB limit, and batch cascade', skipOptions, async () => {
    const batchId = `TEST-BATCH-${randomUUID().slice(0, 8)}`;
    await database.insert(schema.batches).values({
        batchId,
        batchName: 'Phase16 Material Fixture',
        instituteId: 'TEST-INST',
        capacity: 5,
    });
    const baseRow = {
        instituteId: 'TEST-INST',
        title: 'Adapter material',
        description: null,
        status: 'DRAFT',
        uploadedBy: randomUUID(),
    };
    const createdMaterialIds = [];
    try {
        // A DOCUMENT row without its file fields violates the kind exclusivity.
        await assert.rejects(database.insert(studyMaterials).values({ ...baseRow, id: randomUUID(), kind: 'DOCUMENT', batchId: null }), (error) => {
            assert.equal(hasPostgresErrorCode(error, '23514'), true);
            return true;
        });
        // A valid VIDEO row (no file fields) is accepted.
        const video = await database
            .insert(studyMaterials)
            .values({
            ...baseRow,
            id: randomUUID(),
            kind: 'VIDEO',
            youtubeVideoId: 'dQw4w9WgXcQ',
            batchId: null,
        })
            .returning();
        assert.equal(video[0]?.youtubeVideoId, 'dQw4w9WgXcQ');
        createdMaterialIds.push(video[0].id);
        // A document larger than the confirmed 5 MB cap violates the CHECK.
        await assert.rejects(database.insert(studyMaterials).values({
            ...baseRow,
            id: randomUUID(),
            kind: 'DOCUMENT',
            filePath: 'TEST/path.pdf',
            fileName: 'big.pdf',
            fileSize: 5 * 1024 * 1024 + 1,
            documentType: 'PDF',
            youtubeVideoId: null,
            batchId: null,
        }), (error) => {
            assert.equal(hasPostgresErrorCode(error, '23514'), true);
            return true;
        });
        // Targeting one batch: deleting the batch cascades to the material.
        const targeted = await database
            .insert(studyMaterials)
            .values({
            ...baseRow,
            id: randomUUID(),
            title: 'Batch-targeted',
            kind: 'VIDEO',
            youtubeVideoId: 'abcdefghijk',
            batchId,
        })
            .returning();
        assert.equal(targeted[0]?.batchId, batchId);
        createdMaterialIds.push(targeted[0].id);
        await database.delete(schema.batches).where(eq(schema.batches.batchId, batchId));
        const gone = await database.select().from(studyMaterials).where(eq(studyMaterials.id, targeted[0].id));
        assert.equal(gone.length, 0);
        // Clean up the ALL-audience fixture row.
        await database.delete(studyMaterials).where(eq(studyMaterials.id, video[0].id));
    }
    finally {
        // Scoped cleanup only — never touch rows outside this fixture.
        await database.delete(studyMaterials).where(eq(studyMaterials.batchId, batchId));
        await database.delete(schema.batches).where(eq(schema.batches.batchId, batchId));
    }
});
if (shouldRun) {
    test.after(async () => {
        await closeDatabaseConnection();
    });
}
