import type { Request, Response } from 'express';

import { successResponse } from '../../utils/api-response.js';
import type { CreateStudentInput, StudentAccessStatus, UpdateStudentInput } from './student.types.js';
import type { StudentService } from './student.service.js';

export class StudentController {
  public constructor(private readonly service: StudentService) {}

  public list = async (_request: Request, response: Response): Promise<void> => {
    response.status(200).json(successResponse(await this.service.list()));
  };

  public getById = async (_request: Request, response: Response): Promise<void> => {
    const { id } = response.locals.validated.params as { id: string };
    response.status(200).json(successResponse(await this.service.getById(id)));
  };

  public getAccess = async (_request: Request, response: Response): Promise<void> => {
    const { id } = response.locals.validated.params as { id: string };
    response.status(200).json(successResponse(await this.service.getAccessByStudentId(id)));
  };

  public create = async (_request: Request, response: Response): Promise<void> => {
    const input = response.locals.validated.body as CreateStudentInput;
    response.status(201).json(successResponse(await this.service.create(input)));
  };

  public update = async (_request: Request, response: Response): Promise<void> => {
    const { id } = response.locals.validated.params as { id: string };
    const input = response.locals.validated.body as UpdateStudentInput;
    response.status(200).json(successResponse(await this.service.update(id, input)));
  };

  public updateAccessStatus = async (_request: Request, response: Response): Promise<void> => {
    const { id } = response.locals.validated.params as { id: string };
    const { status } = response.locals.validated.body as { status: StudentAccessStatus };
    response.status(200).json(successResponse(await this.service.updateAccessStatus(id, status)));
  };
}
