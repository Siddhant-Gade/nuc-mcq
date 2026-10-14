import { boolean, check, doublePrecision, index, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
export const studentAccessStatus = pgEnum('student_access_status', ['PENDING', 'ACTIVE', 'EXPIRED', 'REVOKED']);
export const batchStatus = pgEnum('batch_status', ['ACTIVE', 'FULL', 'INACTIVE']);
export const authorizationRequestStatus = pgEnum('authorization_request_status', ['PENDING', 'APPROVED', 'REJECTED']);
export const broadcastStatus = pgEnum('broadcast_status', ['DRAFT', 'PUBLISHED']);
export const broadcastAudienceType = pgEnum('broadcast_audience_type', ['ALL', 'BATCH']);
/**
 * Values match the admin UI's Notification.type strings exactly so Phase 15
 * integration needs no translation layer.
 */
export const notificationType = pgEnum('notification_type', ['announcement', 'study_material', 'system']);
/**
 * Phase 14: user-scoped notifications. The recipient is always an application
 * user identified by their verified auth id — rows are never addressable by a
 * client-supplied recipient.
 */
export const notifications = pgTable('notification', {
    id: uuid('id').defaultRandom().primaryKey(),
    recipientAuthUserId: uuid('recipient_auth_user_id').notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    message: text('message').notNull(),
    type: notificationType('type').default('system').notNull(),
    relatedRoute: varchar('related_route', { length: 200 }),
    isRead: boolean('is_read').default(false).notNull(),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index('notification_recipient_created_at_idx').on(table.recipientAuthUserId, table.createdAt)]);
export const studyMaterialKind = pgEnum('study_material_kind', ['DOCUMENT', 'VIDEO']);
export const documentFileType = pgEnum('document_file_type', ['PDF', 'DOC', 'DOCX', 'PPT', 'PPTX']);
export const studyMaterialStatus = pgEnum('study_material_status', ['DRAFT', 'PUBLISHED']);
/**
 * Phase 13 study materials. A row is EITHER an uploaded document (private
 * Supabase Storage object; metadata here) OR a YouTube video link (validated
 * on write; only the video id is stored — embed URLs are derived on read).
 * batch_id NULL means visible to all students; a non-null value targets one
 * batch (confirmed V1 rule: no other targeting levels).
 */
export const studyMaterials = pgTable('study_material', {
    id: uuid('id').defaultRandom().primaryKey(),
    instituteId: varchar('institute_id', { length: 100 }).notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description'),
    kind: studyMaterialKind('kind').notNull(),
    status: studyMaterialStatus('status').default('DRAFT').notNull(),
    filePath: text('file_path'),
    fileName: varchar('file_name', { length: 255 }),
    fileSize: integer('file_size'),
    documentType: documentFileType('document_type'),
    youtubeVideoId: varchar('youtube_video_id', { length: 32 }),
    batchId: varchar('batch_id', { length: 100 }).references(() => batches.batchId, { onDelete: 'cascade' }),
    uploadedBy: uuid('uploaded_by').notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    // Exactly one content variant per row.
    check('study_material_document_fields', sql `${table.kind} <> 'DOCUMENT' OR (${table.filePath} IS NOT NULL AND ${table.fileName} IS NOT NULL AND ${table.fileSize} IS NOT NULL AND ${table.documentType} IS NOT NULL AND ${table.youtubeVideoId} IS NULL)`),
    check('study_material_video_fields', sql `${table.kind} <> 'VIDEO' OR (${table.youtubeVideoId} IS NOT NULL AND ${table.filePath} IS NULL AND ${table.fileName} IS NULL AND ${table.fileSize} IS NULL AND ${table.documentType} IS NULL)`),
    check('study_material_file_size_max', sql `${table.fileSize} IS NULL OR (${table.fileSize} > 0 AND ${table.fileSize} <= 5242880)`),
]);
export const broadcasts = pgTable('broadcast', {
    id: uuid('id').defaultRandom().primaryKey(),
    title: varchar('title', { length: 200 }).notNull(),
    message: text('message').notNull(),
    status: broadcastStatus('status').default('DRAFT').notNull(),
    audienceType: broadcastAudienceType('audience_type').notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
/**
 * Targeting relation. Rows only carry meaning when the parent broadcast's
 * audience_type is BATCH; both foreign keys cascade (confirmed Phase 12 rule:
 * deleting a batch or a broadcast removes its targets).
 */
export const broadcastTargets = pgTable('broadcast_target', {
    broadcastId: uuid('broadcast_id')
        .notNull()
        .references(() => broadcasts.id, { onDelete: 'cascade' }),
    batchId: varchar('batch_id', { length: 100 })
        .notNull()
        .references(() => batches.batchId, { onDelete: 'cascade' }),
}, (table) => [primaryKey({ columns: [table.broadcastId, table.batchId] })]);
/**
 * Per-student read receipts for published broadcasts.
 * Authoritative server-backed persistent read status per SYSTEM_DESIGN.md §12.
 */
export const broadcastReads = pgTable('broadcast_read', {
    id: uuid('id').defaultRandom().primaryKey(),
    broadcastId: uuid('broadcast_id')
        .notNull()
        .references(() => broadcasts.id, { onDelete: 'cascade' }),
    authUserId: uuid('auth_user_id').notNull(),
    readAt: timestamp('read_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    uniqueIndex('broadcast_read_user_broadcast_idx').on(table.authUserId, table.broadcastId),
    index('broadcast_read_user_idx').on(table.authUserId),
]);
export const teachers = pgTable('teacher', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 200 }).notNull(),
    email: varchar('email', { length: 320 }).notNull().unique(),
    mobile: varchar('mobile', { length: 30 }),
    subject: varchar('subject', { length: 200 }),
    instituteId: varchar('institute_id', { length: 100 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
export const batches = pgTable('batch', {
    batchId: varchar('batch_id', { length: 100 }).primaryKey(),
    batchName: varchar('batch_name', { length: 200 }).notNull(),
    instituteId: varchar('institute_id', { length: 100 }).notNull(),
    capacity: integer('capacity').notNull(),
    status: batchStatus('status').default('ACTIVE').notNull(),
    timing: varchar('timing', { length: 100 }),
    teacherId: uuid('teacher_id').references(() => teachers.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [check('batch_capacity_positive', sql `${table.capacity} > 0`)]);
export const studentProfiles = pgTable('student_profile', {
    id: uuid('id').defaultRandom().primaryKey(),
    studentId: varchar('student_id', { length: 100 }).notNull().unique(),
    name: varchar('name', { length: 200 }).notNull(),
    email: varchar('email', { length: 320 }),
    mobile: varchar('mobile', { length: 30 }),
    instituteId: varchar('institute_id', { length: 100 }).notNull(),
    batchId: varchar('batch_id', { length: 100 }).notNull(),
    photoPath: text('photo_path'),
    courseInfo: varchar('course_info', { length: 200 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
export const studentAccess = pgTable('student_access', {
    id: uuid('id').defaultRandom().primaryKey(),
    studentProfileId: uuid('student_profile_id')
        .notNull()
        .unique()
        .references(() => studentProfiles.id, { onDelete: 'cascade' }),
    authUserId: uuid('auth_user_id').unique(),
    status: studentAccessStatus('status').default('PENDING').notNull(),
    accessGrantedAt: timestamp('access_granted_at', { withTimezone: true }),
    accessExpiryAt: timestamp('access_expiry_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
export const testResultMode = pgEnum('test_result_mode', ['PRACTICE', 'EXAM']);
export const testResults = pgTable('test_result', {
    id: uuid('id').defaultRandom().primaryKey(),
    clientEventId: varchar('client_event_id', { length: 100 }).notNull().unique(),
    studentProfileId: uuid('student_profile_id').notNull().references(() => studentProfiles.id, { onDelete: 'cascade' }),
    authUserId: uuid('auth_user_id').notNull(),
    testId: varchar('test_id', { length: 100 }).notNull(),
    mode: testResultMode('mode').notNull(),
    questionBankVersion: varchar('question_bank_version', { length: 50 }),
    blueprintVersion: varchar('blueprint_version', { length: 50 }),
    totalQuestions: integer('total_questions').notNull(),
    correctCount: integer('correct_count').notNull(),
    wrongCount: integer('wrong_count').notNull(),
    score: doublePrecision('score').notNull(),
    wrongQuestionIds: jsonb('wrong_question_ids').$type().default([]).notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }).notNull(),
    syncedAt: timestamp('synced_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    check('test_result_counts_total', sql `${table.correctCount} <= ${table.totalQuestions}`),
    check('test_result_wrong_within_total', sql `${table.wrongCount} <= ${table.totalQuestions}`),
    check('test_result_sum_within_total', sql `(${table.correctCount} + ${table.wrongCount}) <= ${table.totalQuestions}`),
    check('test_result_score_non_negative', sql `${table.score} >= 0`),
]);
export const authorizationRequests = pgTable('authorization_request', {
    id: uuid('id').defaultRandom().primaryKey(),
    studentProfileId: uuid('student_profile_id')
        .notNull()
        .references(() => studentProfiles.id, { onDelete: 'cascade' }),
    authUserId: uuid('auth_user_id'),
    requestedAt: timestamp('requested_at', { withTimezone: true }).defaultNow().notNull(),
    status: authorizationRequestStatus('status').default('PENDING').notNull(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewedBy: uuid('reviewed_by'),
});
export const questions = pgTable('question', {
    id: uuid('id').defaultRandom().primaryKey(),
    sr: integer('sr'),
    section: varchar('section', { length: 100 }).notNull(),
    questionEn: text('question_en').notNull(),
    optAEn: text('opt_a_en').notNull(),
    optBEn: text('opt_b_en').notNull(),
    optCEn: text('opt_c_en').notNull(),
    optDEn: text('opt_d_en').notNull(),
    correctOption: varchar('correct_option', { length: 10 }).default('A'),
    correctIndex: integer('correct_index').default(0).notNull(),
    correctAnswer: text('correct_answer'),
    explanationEn: text('explanation_en'),
    questionMr: text('question_mr'),
    optAMr: text('opt_a_mr'),
    optBMr: text('opt_b_mr'),
    optCMr: text('opt_c_mr'),
    optDMr: text('opt_d_mr'),
    explanationMr: text('explanation_mr'),
    questionHi: text('question_hi'),
    optAHi: text('opt_a_hi'),
    optBHi: text('opt_b_hi'),
    optCHi: text('opt_c_hi'),
    optDHi: text('opt_d_hi'),
    explanationHi: text('explanation_hi'),
    instituteId: varchar('institute_id', { length: 100 }).default('INST001').notNull(),
    version: varchar('version', { length: 50 }).default('1.0.0').notNull(),
    uploadedBy: uuid('uploaded_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index('question_section_idx').on(table.section),
    index('question_institute_idx').on(table.instituteId),
]);

export const studentDeviceTokens = pgTable('student_device_token', {
    id: uuid('id').defaultRandom().primaryKey(),
    authUserId: uuid('auth_user_id').notNull(),
    fcmToken: varchar('fcm_token', { length: 512 }).notNull().unique(),
    devicePlatform: varchar('device_platform', { length: 20 }).default('android').notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index('device_token_auth_user_idx').on(table.authUserId),
    index('device_token_fcm_token_idx').on(table.fcmToken),
]);

