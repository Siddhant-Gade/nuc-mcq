import { z } from 'zod';
import { parseYoutubeVideoId } from './study-material.content.js';
import { studyMaterialStatuses } from './study-material.types.js';
const titleSchema = z
    .string({ message: 'Title must be a string.' })
    .trim()
    .min(1, 'Title is required.')
    .max(200, 'Title cannot exceed 200 characters.');
const descriptionSchema = z
    .string({ message: 'Description must be a string.' })
    .trim()
    .max(2_000, 'Description cannot exceed 2,000 characters.');
const batchIdSchema = z
    .string()
    .trim()
    .min(1, 'Batch ID must not be empty.')
    .max(100, 'Batch ID is too long.');
export const createDocumentBodySchema = z.object({
    title: titleSchema,
    description: descriptionSchema.optional(),
    // Empty/absent batch id = all students; a value targets exactly one batch.
    batchId: batchIdSchema.optional(),
});
export const createVideoSchema = z.object({
    title: titleSchema,
    description: descriptionSchema.optional(),
    batchId: batchIdSchema.optional(),
    youtubeUrl: z
        .string({ message: 'YouTube URL must be a string.' })
        .trim()
        .min(1, 'YouTube URL is required.')
        .max(2_048, 'YouTube URL is too long.')
        .refine((value) => parseYoutubeVideoId(value) !== null, {
        message: 'Provide a valid YouTube video URL (watch, youtu.be, shorts, or embed form).',
    }),
});
export const updateStudyMaterialSchema = z
    .object({
    title: titleSchema.optional(),
    description: descriptionSchema.nullable().optional(),
    status: z.enum(studyMaterialStatuses).optional(),
    batchId: batchIdSchema.nullable().optional(),
})
    .superRefine((value, context) => {
    if (value.title === undefined &&
        value.description === undefined &&
        value.status === undefined &&
        value.batchId === undefined) {
        context.addIssue({
            code: 'custom',
            message: 'Provide at least one field to update.',
            path: [],
        });
    }
});
export const studyMaterialIdParamsSchema = z.object({
    id: z.uuid('Study material ID must be a UUID.'),
});
