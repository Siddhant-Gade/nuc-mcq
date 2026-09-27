import { z } from 'zod';
const requiredIdentifier = (fieldName) => z.string().trim().min(1, `${fieldName} is required.`).max(100, `${fieldName} is too long.`);
export const batchIdParamsSchema = z.object({
    batchId: requiredIdentifier('Batch ID'),
});
export const createBatchSchema = z.object({
    batchId: requiredIdentifier('Batch ID'),
    batchName: z.string().trim().min(1, 'Batch name is required.').max(200),
    instituteId: requiredIdentifier('Institute ID'),
    capacity: z
        .number('Capacity must be a number.')
        .int('Capacity must be a whole number.')
        .min(1, 'Capacity must be at least 1.')
        .max(10_000, 'Capacity is unreasonably large.'),
    timing: z.string().trim().max(100).optional(),
});
export const updateBatchSchema = z.object({
    timing: z.string().trim().max(100).nullable().optional(),
});
