import type { Request, Response } from 'express';

import { successResponse } from '../../utils/api-response.js';
import { ApiError } from '../../utils/api-error.js';
import type { AuthorizationRequestService } from './authorization.service.js';
import type { AuthorizationRequestStatus } from './authorization.types.js';

const statusFilter = (value: unknown): AuthorizationRequestStatus | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.toUpperCase();
  return normalized === 'PENDING' || normalized === 'APPROVED' || normalized === 'REJECTED'
    ? normalized
    : undefined;
};

export class AuthorizationRequestController {
  public constructor(private readonly service: AuthorizationRequestService) {}

  public list = async (request: Request, response: Response): Promise<void> => {
    response.status(200).json(successResponse(await this.service.list(statusFilter(request.query.status))));
  };

  public listPending = async (_request: Request, response: Response): Promise<void> => {
    response.status(200).json(successResponse(await this.service.list('PENDING')));
  };

  public getById = async (_request: Request, response: Response): Promise<void> => {
    const { id } = response.locals.validated.params as { id: string };
    response.status(200).json(successResponse(await this.service.getById(id)));
  };

  public approve = async (request: Request, response: Response): Promise<void> => {
    const { id } = response.locals.validated.params as { id: string };
    // Reviewer identity is derived from the verified token — never the body.
    const reviewerAuthUserId = request.auth?.authUserId;

    if (reviewerAuthUserId === undefined) {
      throw new ApiError(401, 'AUTHENTICATION_ERROR', 'Authentication token is required.');
    }

    response.status(200).json(successResponse(await this.service.approve(id, reviewerAuthUserId)));
  };

  public reject = async (request: Request, response: Response): Promise<void> => {
    const { id } = response.locals.validated.params as { id: string };
    const reviewerAuthUserId = request.auth?.authUserId;

    if (reviewerAuthUserId === undefined) {
      throw new ApiError(401, 'AUTHENTICATION_ERROR', 'Authentication token is required.');
    }

    response.status(200).json(successResponse(await this.service.reject(id, reviewerAuthUserId)));
  };
}
