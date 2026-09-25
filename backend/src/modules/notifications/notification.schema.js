import { z } from 'zod';
export const notificationIdParamsSchema = z.object({
    id: z.uuid('Notification ID must be a UUID.'),
});
