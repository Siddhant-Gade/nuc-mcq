import fs from 'node:fs';
import path from 'node:path';
import { ApiError } from '../../utils/api-error.js';
import { successResponse } from '../../utils/api-response.js';
/** Single-institute V1: same constant the admission flow uses. */
const DEFAULT_INSTITUTE_ID = 'INST001';
export class StudyMaterialController {
    service;
    requireActiveStudent;
    constructor(service, requireActiveStudent) {
        this.service = service;
        this.requireActiveStudent = requireActiveStudent;
    }
    requireAdminIdentity(request) {
        const authUserId = request.auth?.authUserId;
        if (authUserId === undefined) {
            throw new ApiError(401, 'AUTHENTICATION_ERROR', 'Authentication token is required.');
        }
        return authUserId;
    }
    list = async (_request, response) => {
        response.status(200).json(successResponse(await this.service.list()));
    };
    getById = async (request, response) => {
        response.status(200).json(successResponse(await this.service.getById(request.params.id)));
    };
    createDocument = async (request, response) => {
        const authUserId = this.requireAdminIdentity(request);
        const body = response.locals.validated.body;
        const file = request.file;
        if (file === undefined) {
            throw new ApiError(400, 'VALIDATION_ERROR', 'A document file is required.');
        }
        const material = await this.service.createDocument(authUserId, {
            title: body.title,
            ...(body.description !== undefined ? { description: body.description } : {}),
            instituteId: DEFAULT_INSTITUTE_ID,
            batchId: body.batchId ?? null,
            fileName: file.originalname,
            fileBuffer: file.buffer,
            contentType: file.mimetype,
        });
        response.status(201).json(successResponse(material));
    };
    createVideo = async (request, response) => {
        const authUserId = this.requireAdminIdentity(request);
        const payload = response.locals.validated.body;
        const material = await this.service.createVideo(authUserId, {
            title: payload.title,
            ...(payload.description !== undefined ? { description: payload.description } : {}),
            instituteId: DEFAULT_INSTITUTE_ID,
            batchId: payload.batchId ?? null,
            youtubeUrl: payload.youtubeUrl,
        });
        response.status(201).json(successResponse(material));
    };
    update = async (request, response) => {
        this.requireAdminIdentity(request);
        const payload = response.locals.validated.body;
        const material = await this.service.update(request.params.id, {
            ...(payload.title !== undefined ? { title: payload.title } : {}),
            ...(payload.description !== undefined ? { description: payload.description } : {}),
            ...(payload.status !== undefined ? { status: payload.status } : {}),
            ...(payload.batchId !== undefined ? { batchId: payload.batchId } : {}),
        });
        response.status(200).json(successResponse(material));
    };
    publish = async (request, response) => {
        this.requireAdminIdentity(request);
        response.status(200).json(successResponse(await this.service.publish(request.params.id)));
    };
    remove = async (request, response) => {
        this.requireAdminIdentity(request);
        await this.service.remove(request.params.id);
        response.status(200).json(successResponse({ deleted: true }));
    };
    /** STUDENT surface — identity and batch come only from the verified token. */
    listForStudent = async (request, response) => {
        const authUserId = request.auth?.authUserId;
        if (authUserId === undefined) {
            throw new ApiError(401, 'AUTHENTICATION_ERROR', 'Authentication token is required.');
        }
        const identity = await this.requireActiveStudent(authUserId, request.auth?.email);
        response
            .status(200)
            .json(successResponse(await this.service.listForStudent(identity.profile.batchId)));
    };
    getStudentAccess = async (request, response) => {
        const authUserId = request.auth?.authUserId;
        if (authUserId === undefined) {
            throw new ApiError(401, 'AUTHENTICATION_ERROR', 'Authentication token is required.');
        }
        const identity = await this.requireActiveStudent(authUserId, request.auth?.email);
        const outcome = await this.service.getStudentAccess(request.params.id, identity.profile.batchId);
        response.status(200).json(successResponse(outcome.kind === 'DOCUMENT'
            ? {
                kind: outcome.kind,
                material: outcome.view,
                fileName: outcome.fileName,
                url: outcome.signedUrl,
                expiresInSeconds: outcome.expiresInSeconds,
            }
            : { kind: outcome.kind, material: outcome.view, embedUrl: outcome.embedUrl }));
    };
    downloadForStudent = async (request, response) => {
        const authUserId = request.auth?.authUserId;
        if (authUserId === undefined) {
            throw new ApiError(401, 'AUTHENTICATION_ERROR', 'Authentication token is required.');
        }
        const identity = await this.requireActiveStudent(authUserId, request.auth?.email);
        const outcome = await this.service.getStudentAccess(request.params.id, identity.profile.batchId);
        if (outcome.kind !== 'DOCUMENT') {
            throw new ApiError(400, 'VALIDATION_ERROR', 'This material is not a document.');
        }
        if (outcome.signedUrl.startsWith('http://') || outcome.signedUrl.startsWith('https://')) {
            response.redirect(outcome.signedUrl);
            return;
        }
        const rawPath = outcome.signedUrl.replace('/api/v1/study-materials/files/', '');
        const decoded = decodeURIComponent(rawPath);
        const candidates = [
            path.resolve(process.cwd(), 'uploads', 'study-materials', decoded),
            path.resolve(process.cwd(), 'backend', 'uploads', 'study-materials', decoded),
        ];
        const safePath = candidates.find((candidate) => fs.existsSync(candidate));
        if (!safePath) {
            throw new ApiError(404, 'NOT_FOUND', 'File not found on server.');
        }
        response.download(safePath, outcome.fileName);
    };
}
