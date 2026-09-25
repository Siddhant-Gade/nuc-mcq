import { ApiError } from '../../utils/api-error.js';
import { successResponse } from '../../utils/api-response.js';
export class NotificationController {
    service;
    constructor(service) {
        this.service = service;
    }
    requireIdentity(request) {
        const authUserId = request.auth?.authUserId;
        if (authUserId === undefined) {
            throw new ApiError(401, 'AUTHENTICATION_ERROR', 'Authentication token is required.');
        }
        return authUserId;
    }
    list = async (request, response) => {
        response.status(200).json(successResponse(await this.service.list(this.requireIdentity(request))));
    };
    unreadCount = async (request, response) => {
        response.status(200).json(successResponse({ count: await this.service.unreadCount(this.requireIdentity(request)) }));
    };
    markRead = async (request, response) => {
        const authUserId = this.requireIdentity(request);
        const { id } = response.locals.validated.params;
        response.status(200).json(successResponse(await this.service.markRead(authUserId, id)));
    };
    markAllRead = async (request, response) => {
        response.status(200).json(successResponse(await this.service.markAllRead(this.requireIdentity(request))));
    };
}
