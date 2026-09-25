import { z } from 'zod';
import { studentAccessStatuses } from './student.types.js';
const optionalText = (maxLength) => z.preprocess((value) => (value === '' ? undefined : value), z.string().trim().min(1).max(maxLength).optional());
const requiredIdentifier = (fieldName) => z.string().trim().min(1, `${fieldName} is required.`).max(100, `${fieldName} is too long.`);
export const studentIdParamsSchema = z.object({
    id: z.uuid('Student ID must be a UUID.'),
});
export const createStudentSchema = z.object({
    studentId: requiredIdentifier('Student ID'),
    name: z.string().trim().min(1, 'Name is required.').max(200),
    instituteId: requiredIdentifier('Institute ID'),
    batchId: requiredIdentifier('Batch ID'),
    email: z.preprocess((value) => (value === '' ? undefined : value), z.email().optional()),
    mobile: optionalText(30),
    photoPath: optionalText(500_000),
    courseInfo: optionalText(200),
});
export const updateStudentSchema = createStudentSchema
    .omit({ studentId: true })
    .partial()
    .refine((input) => Object.keys(input).length > 0, 'At least one student field must be provided.');
export const updateStudentStatusSchema = z.object({
    status: z.enum(studentAccessStatuses),
});
