import { pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const studentAccessStatus = pgEnum('student_access_status', ['PENDING', 'ACTIVE', 'EXPIRED', 'REVOKED']);

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
