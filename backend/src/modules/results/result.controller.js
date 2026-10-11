import { ApiError } from '../../utils/api-error.js';
import { successResponse } from '../../utils/api-response.js';
export class ResultController {
    service;
    requireActiveStudent;
    constructor(service, requireActiveStudent) {
        this.service = service;
        this.requireActiveStudent = requireActiveStudent;
    }
    sync = async (request, response) => {
        const authUserId = request.auth?.authUserId;
        if (authUserId === undefined) {
            throw new ApiError(401, 'AUTHENTICATION_ERROR', 'Authentication token is required.');
        }
        // Identity comes only from the verified token → active student link;
        // any student id in the body is advisory at best.
        const identity = await this.requireActiveStudent(authUserId, request.auth?.email);
        const input = response.locals.validated.body;
        const outcome = await this.service.sync({ profileId: identity.profile.id, authUserId, studentId: identity.profile.studentId }, input);
        response.status(200).json(successResponse(outcome));
    };
    listMyResults = async (request, response) => {
        const authUserId = request.auth?.authUserId;
        if (authUserId === undefined) {
            throw new ApiError(401, 'AUTHENTICATION_ERROR', 'Authentication token is required.');
        }
        const identity = await this.requireActiveStudent(authUserId, request.auth?.email);
        const records = await this.service.getHistory(identity.profile.id);
        response.status(200).json(successResponse(records));
    };
}
