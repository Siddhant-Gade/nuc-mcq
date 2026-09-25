import { z } from 'zod';
export const teacherIdParamsSchema = z.object({
    id: z.string().uuid('Teacher ID must be a valid UUID.'),
});
export const createTeacherSchema = z.object({
    name: z.string().trim().min(1, 'Name is required.').max(200),
    email: z.string().trim().email('A valid email is required.').max(320),
    mobile: z.string().trim().max(30).optional(),
    subject: z.string().trim().max(200).optional(),
    instituteId: z.string().trim().max(100).optional(),
});
export const updateTeacherSchema = z.object({
    name: z.string().trim().min(1).max(200).optional(),
    email: z.string().trim().email().max(320).optional(),
    mobile: z.string().trim().max(30).nullable().optional(),
    subject: z.string().trim().max(200).nullable().optional(),
});
