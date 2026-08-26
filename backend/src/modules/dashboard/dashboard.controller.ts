import type { Request, Response } from 'express';

import { successResponse } from '../../utils/api-response.js';
import type { DashboardService } from './dashboard.service.js';

export class DashboardController {
  public constructor(private readonly service: DashboardService) {}

  public getStats = async (_request: Request, response: Response): Promise<void> => {
    response.status(200).json(successResponse(await this.service.getStats()));
  };
}
