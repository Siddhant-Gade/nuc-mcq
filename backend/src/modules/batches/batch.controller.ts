import type { Request, Response } from 'express';

import { successResponse } from '../../utils/api-response.js';
import type { BatchService } from './batch.service.js';
import type { CreateBatchInput } from './batch.types.js';

export class BatchController {
  public constructor(private readonly service: BatchService) {}

  public list = async (_request: Request, response: Response): Promise<void> => {
    response.status(200).json(successResponse(await this.service.list()));
  };

  public listActive = async (_request: Request, response: Response): Promise<void> => {
    response.status(200).json(successResponse(await this.service.listAvailableForAdmission()));
  };

  public getById = async (_request: Request, response: Response): Promise<void> => {
    const { batchId } = response.locals.validated.params as { batchId: string };
    response.status(200).json(successResponse(await this.service.getById(batchId)));
  };

  public create = async (_request: Request, response: Response): Promise<void> => {
    const input = response.locals.validated.body as CreateBatchInput;
    response.status(201).json(successResponse(await this.service.create(input)));
  };

  public remove = async (_request: Request, response: Response): Promise<void> => {
    const { batchId } = response.locals.validated.params as { batchId: string };
    await this.service.remove(batchId);
    response.status(200).json(successResponse({ deleted: true }));
  };
}
