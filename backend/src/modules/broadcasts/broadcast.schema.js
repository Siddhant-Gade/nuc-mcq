import { z } from 'zod';
import { broadcastAudienceTypes } from './broadcast.types.js';
const titleSchema = z
    .string({ message: 'Title must be a string.' })
    .trim()
    .min(1, 'Title is required.')
    .max(200, 'Title cannot exceed 200 characters.');
const messageSchema = z
    .string({ message: 'Message must be a string.' })
    .trim()
    .min(1, 'Message is required.')
    .max(10_000, 'Message cannot exceed 10,000 characters.');
const targetBatchIdsSchema = z
    .array(z.string().trim().min(1, 'Batch IDs must not be empty.').max(100), {
    message: 'Target batches must be an array of identifiers.',
})
    .max(100, 'A broadcast cannot target more than 100 batches.');
export const createBroadcastSchema = z
    .object({
    title: titleSchema,
    message: messageSchema,
    audienceType: z.enum(broadcastAudienceTypes),
    targetBatchIds: targetBatchIdsSchema.optional(),
})
    .superRefine((value, context) => {
    if (value.audienceType === 'BATCH' && (value.targetBatchIds === undefined || value.targetBatchIds.length === 0)) {
        context.addIssue({
            code: 'custom',
            message: 'At least one target batch is required for a batch-audience broadcast.',
            path: ['targetBatchIds'],
        });
    }
});
export const updateBroadcastSchema = z
    .object({
    title: titleSchema.optional(),
    message: messageSchema.optional(),
    audienceType: z.enum(broadcastAudienceTypes).optional(),
    targetBatchIds: targetBatchIdsSchema.optional(),
})
    .superRefine((value, context) => {
    if (value.audienceType === 'BATCH' && value.targetBatchIds !== undefined && value.targetBatchIds.length === 0) {
        context.addIssue({
            code: 'custom',
            message: 'At least one target batch is required for a batch-audience broadcast.',
            path: ['targetBatchIds'],
        });
    }
});
