import { z } from 'zod';
import { testResultModes } from './result.types.js';
const nonNegativeCount = (fieldName) => z
    .number(`${fieldName} must be a number.`)
    .int(`${fieldName} must be a whole number.`)
    .min(0, `${fieldName} cannot be negative.`);
export const createResultSchema = z
    .object({
    clientEventId: z
        .string()
        .trim()
        .min(1, 'Client event ID is required.')
        .max(100, 'Client event ID is too long.'),
    clientStudentId: z.string().trim().min(1, 'Client student ID must not be empty.').max(100).optional(),
    testId: z.string().trim().min(1, 'Test ID is required.').max(100, 'Test ID is too long.'),
    mode: z.enum(testResultModes),
    questionBankVersion: z.string().trim().min(1).max(50).optional(),
    blueprintVersion: z.string().trim().min(1).max(50).optional(),
    totalQuestions: nonNegativeCount('Total questions'),
    correctCount: nonNegativeCount('Correct count'),
    wrongCount: nonNegativeCount('Wrong count'),
    score: z.number('Score must be a number.').min(0, 'Score cannot be negative.'),
    wrongQuestionIds: z.array(z.string()).optional(),
    completedAt: z.coerce.date(),
})
    .superRefine((value, context) => {
    if (value.correctCount > value.totalQuestions) {
        context.addIssue({
            code: 'custom',
            message: 'Correct count cannot exceed the total number of questions.',
            path: ['correctCount'],
        });
    }
    if (value.wrongCount > value.totalQuestions) {
        context.addIssue({
            code: 'custom',
            message: 'Wrong count cannot exceed the total number of questions.',
            path: ['wrongCount'],
        });
    }
    if (value.correctCount + value.wrongCount > value.totalQuestions) {
        context.addIssue({
            code: 'custom',
            message: 'The combined correct and wrong counts cannot exceed the total number of questions.',
            path: ['totalQuestions'],
        });
    }
    if (value.wrongQuestionIds !== undefined && value.wrongQuestionIds.length !== value.wrongCount) {
        context.addIssue({
            code: 'custom',
            message: 'The number of wrong question IDs must match the wrong count.',
            path: ['wrongQuestionIds'],
        });
    }
});
