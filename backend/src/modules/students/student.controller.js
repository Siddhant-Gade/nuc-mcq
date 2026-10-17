import { successResponse } from '../../utils/api-response.js';

export class StudentController {
    service;
    constructor(service) {
        this.service = service;
    }
    list = async (_request, response) => {
        response.status(200).json(successResponse(await this.service.list()));
    };
    getById = async (_request, response) => {
        const { id } = response.locals.validated.params;
        response.status(200).json(successResponse(await this.service.getById(id)));
    };
    getAccess = async (_request, response) => {
        const { id } = response.locals.validated.params;
        response.status(200).json(successResponse(await this.service.getAccessByStudentId(id)));
    };
    create = async (_request, response) => {
        const input = response.locals.validated.body;
        const student = await this.service.create(input);
        response.status(201).json(successResponse({ ...student, student }));
    };
    update = async (_request, response) => {
        const { id } = response.locals.validated.params;
        const input = response.locals.validated.body;
        response.status(200).json(successResponse(await this.service.update(id, input)));
    };
    updateAccessStatus = async (_request, response) => {
        const { id } = response.locals.validated.params;
        const { status } = response.locals.validated.body;
        response.status(200).json(successResponse(await this.service.updateAccessStatus(id, status)));
    };
    suspend = async (request, response) => {
        const { id } = response.locals.validated.params;
        const reason = request.body?.reason;
        const suspendedBy = request.auth?.authUserId;
        const result = await this.service.suspend(id, reason, suspendedBy);
        response.status(200).json(successResponse(result));
    };
    restore = async (_request, response) => {
        const { id } = response.locals.validated.params;
        const result = await this.service.restore(id);
        response.status(200).json(successResponse(result));
    };
    delete = async (_request, response) => {
        const { id } = response.locals.validated.params;
        await this.service.delete(id);
        response.status(200).json(successResponse({ deleted: true, id }));
    };
    getPerformance = async (_request, response) => {
        const { id } = response.locals.validated.params;
        response.status(200).json(successResponse(await this.service.getPerformance(id)));
    };
}
