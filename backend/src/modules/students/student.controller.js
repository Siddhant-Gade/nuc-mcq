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
        response.status(201).json(successResponse(await this.service.create(input)));
    };
    update = async (_request, response) => {
        const { id } = response.locals.validated.params;
        const input = response.locals.validated.body;
        response.status(200).json(successResponse(await this.service.update(id, input)));
    };
    updateAccessStatus = async (_request, response) => {
        const { id } = response.locals.validated.params;
        const { status } = response.locals.validated.body;
        response.status(200).json(successResponse(await this.service.updateAccessStatus(id, status, _request.auth?.authUserId)));
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
