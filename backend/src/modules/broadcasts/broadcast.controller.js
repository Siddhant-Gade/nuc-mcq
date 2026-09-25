import { ApiError } from '../../utils/api-error.js';
import { successResponse } from '../../utils/api-response.js';
export class BroadcastController {
    service;
    constructor(service) {
        this.service = service;
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
    create = async (request, response) => {
        const authUserId = this.requireAdminIdentity(request);
        const payload = response.locals.validated.body;
        const broadcast = await this.service.create(authUserId, {
            title: payload.title,
            message: payload.message,
            audienceType: payload.audienceType,
            ...(payload.targetBatchIds !== undefined ? { targetBatchIds: payload.targetBatchIds } : {}),
        });
        response.status(201).json(successResponse(broadcast));
    };
    update = async (request, response) => {
        this.requireAdminIdentity(request);
        const payload = response.locals.validated.body;
        const { title, message, audienceType, targetBatchIds } = payload;
        response.status(200).json(successResponse(await this.service.update(request.params.id, {
            ...(title !== undefined ? { title } : {}),
            ...(message !== undefined ? { message } : {}),
            ...(audienceType !== undefined ? { audienceType } : {}),
            ...(targetBatchIds !== undefined ? { targetBatchIds } : {}),
        })));
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
}
