import { successResponse } from '../../utils/api-response.js';
export class BatchController {
    service;
    constructor(service) {
        this.service = service;
    }
    list = async (_request, response) => {
        response.status(200).json(successResponse(await this.service.list()));
    };
    listActive = async (_request, response) => {
        response.status(200).json(successResponse(await this.service.listAvailableForAdmission()));
    };
    getById = async (_request, response) => {
        const { batchId } = response.locals.validated.params;
        response.status(200).json(successResponse(await this.service.getById(batchId)));
    };
    create = async (_request, response) => {
        const input = response.locals.validated.body;
        response.status(201).json(successResponse(await this.service.create(input)));
    };
    remove = async (_request, response) => {
        const { batchId } = response.locals.validated.params;
        await this.service.remove(batchId);
        response.status(200).json(successResponse({ deleted: true }));
    };
}
