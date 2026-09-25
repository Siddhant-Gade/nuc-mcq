import { successResponse } from '../../utils/api-response.js';
import { ApiError } from '../../utils/api-error.js';
const statusFilter = (value) => {
    if (typeof value !== 'string') {
        return undefined;
    }
    const normalized = value.toUpperCase();
    return normalized === 'PENDING' || normalized === 'APPROVED' || normalized === 'REJECTED'
        ? normalized
        : undefined;
};
export class AuthorizationRequestController {
    service;
    constructor(service) {
        this.service = service;
    }
    list = async (request, response) => {
        response.status(200).json(successResponse(await this.service.list(statusFilter(request.query.status))));
    };
    listPending = async (_request, response) => {
        response.status(200).json(successResponse(await this.service.list('PENDING')));
    };
    getById = async (_request, response) => {
        const { id } = response.locals.validated.params;
        response.status(200).json(successResponse(await this.service.getById(id)));
    };
    approve = async (request, response) => {
        const { id } = response.locals.validated.params;
        // Reviewer identity is derived from the verified token — never the body.
        const reviewerAuthUserId = request.auth?.authUserId;
        if (reviewerAuthUserId === undefined) {
            throw new ApiError(401, 'AUTHENTICATION_ERROR', 'Authentication token is required.');
        }
        response.status(200).json(successResponse(await this.service.approve(id, reviewerAuthUserId)));
    };
    reject = async (request, response) => {
        const { id } = response.locals.validated.params;
        const reviewerAuthUserId = request.auth?.authUserId;
        if (reviewerAuthUserId === undefined) {
            throw new ApiError(401, 'AUTHENTICATION_ERROR', 'Authentication token is required.');
        }
        response.status(200).json(successResponse(await this.service.reject(id, reviewerAuthUserId)));
    };
}
