import { successResponse } from '../../utils/api-response.js';
export class DashboardController {
    service;
    constructor(service) {
        this.service = service;
    }
    getStats = async (_request, response) => {
        response.status(200).json(successResponse(await this.service.getStats()));
    };
    getStudentAnalytics = async (_request, response) => {
        response.status(200).json(successResponse(await this.service.getStudentAnalytics()));
    };
}
