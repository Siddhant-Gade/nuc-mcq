import { z } from 'zod';
export const authorizationRequestIdParamsSchema = z.object({
    id: z.uuid('Authorization request ID must be a UUID.'),
});
