import type { RequestHandler } from 'express';

export const createCorsMiddleware = (allowedOrigins: readonly string[]): RequestHandler => {
  const allowedOriginSet = new Set(allowedOrigins);

  return (request, response, next): void => {
    const origin = request.header('origin');

    if (origin !== undefined && allowedOriginSet.has(origin)) {
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Vary', 'Origin');
      response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
      response.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type');
    }

    if (request.method === 'OPTIONS') {
      response.sendStatus(204);
      return;
    }

    next();
  };
};
