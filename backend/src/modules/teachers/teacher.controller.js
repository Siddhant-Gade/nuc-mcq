import { successResponse } from '../../utils/api-response.js';
export class TeacherController {
    service;
    constructor(service) { this.service = service; }
    list = async (req, res, next) => {
        try { res.status(200).json(successResponse(await this.service.list())); } catch (e) { next(e); }
    };
    getById = async (req, res, next) => {
        try { res.status(200).json(successResponse(await this.service.getById(req.params.id))); } catch (e) { next(e); }
    };
    create = async (req, res, next) => {
        try { res.status(201).json(successResponse(await this.service.create(req.body))); } catch (e) { next(e); }
    };
    update = async (req, res, next) => {
        try { res.status(200).json(successResponse(await this.service.update(req.params.id, req.body))); } catch (e) { next(e); }
    };
    remove = async (req, res, next) => {
        try { await this.service.remove(req.params.id); res.status(204).send(); } catch (e) { next(e); }
    };
}
