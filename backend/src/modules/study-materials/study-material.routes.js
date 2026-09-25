import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { createAuthenticationMiddleware } from '../../middleware/auth.middleware.js';
import { requireRoles } from '../../middleware/authorization.middleware.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import { ApiError } from '../../utils/api-error.js';
import { MAX_DOCUMENT_BYTES } from '../../utils/storage.js';
import { StudyMaterialController } from './study-material.controller.js';
import { createDocumentBodySchema, createVideoSchema, studyMaterialIdParamsSchema, updateStudyMaterialSchema, } from './study-material.schema.js';
const ALLOWED_MIME_TYPES = new Set([
    'application/pdf',
    // Word
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    // PowerPoint
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Excel
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_DOCUMENT_BYTES },
    fileFilter: (_request, file, callback) => {
        if (ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
            callback(null, true);
            return;
        }
        callback(new ApiError(400, 'VALIDATION_ERROR', 'Unsupported document type. Only PDF, DOC, DOCX, PPT, PPTX, XLS, and XLSX are allowed.'));
    },
});
/** Converts multer failures into the API's structured error shape. */
const uploadSingleDocument = (request, response, next) => {
    upload.single('file')(request, response, (error) => {
        if (error === undefined) {
            next();
            return;
        }
        if (error instanceof ApiError) {
            next(error);
            return;
        }
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'LIMIT_FILE_SIZE') {
            next(new ApiError(400, 'VALIDATION_ERROR', 'Document exceeds the 5 MB limit.'));
            return;
        }
        next(new ApiError(400, 'VALIDATION_ERROR', 'The document upload could not be processed.'));
    });
};
/** Admin-only management surface under /api/v1/study-materials. */
export const createStudyMaterialAdminRouter = (service, tokenVerifier, requireActiveStudentAdmin) => {
    const router = Router();
    const controller = new StudyMaterialController(service, requireActiveStudentAdmin);
    const authenticate = createAuthenticationMiddleware(tokenVerifier);
    const requireAdmin = [authenticate, requireRoles('ADMIN')];
    router.get('/', ...requireAdmin, controller.list);
    router.get('/:id', ...requireAdmin, validateRequest({ params: studyMaterialIdParamsSchema }), controller.getById);
    router.post('/documents', ...requireAdmin, uploadSingleDocument, validateRequest({ body: createDocumentBodySchema }), controller.createDocument);
    router.post('/videos', ...requireAdmin, validateRequest({ body: createVideoSchema }), controller.createVideo);
    router.patch('/:id', ...requireAdmin, validateRequest({ params: studyMaterialIdParamsSchema, body: updateStudyMaterialSchema }), controller.update);
    router.get('/files/{*filePath}', (request, response) => {
        const rawPath = request.params.filePath || '';
        const decoded = decodeURIComponent(rawPath);
        const candidates = [
            path.resolve(process.cwd(), 'uploads', 'study-materials', decoded),
            path.resolve(process.cwd(), 'backend', 'uploads', 'study-materials', decoded),
        ];
        const safePath = candidates.find((candidate) => fs.existsSync(candidate));
        if (!safePath) {
            response.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'File not found.' } });
            return;
        }
        response.download(safePath);
    });
    router.post('/:id/publish', ...requireAdmin, validateRequest({ params: studyMaterialIdParamsSchema }), controller.publish);
    router.delete('/:id', ...requireAdmin, validateRequest({ params: studyMaterialIdParamsSchema }), controller.remove);
    return router;
};
/**
 * Phase 13 student surface. Visibility (PUBLISHED + all/own batch) is decided
 * by the backend; identity and batch come only from the verified token.
 */
export const createStudentStudyMaterialRouter = (service, tokenVerifier, requireActiveStudent) => {
    const router = Router();
    const controller = new StudyMaterialController(service, requireActiveStudent);
    const authenticate = createAuthenticationMiddleware(tokenVerifier);
    router.get('/', authenticate, requireRoles('STUDENT'), controller.listForStudent);
    router.get('/:id/access', authenticate, requireRoles('STUDENT'), validateRequest({ params: studyMaterialIdParamsSchema }), controller.getStudentAccess);
    router.get('/:id/download', authenticate, requireRoles('STUDENT'), validateRequest({ params: studyMaterialIdParamsSchema }), controller.downloadForStudent);
    return router;
};
