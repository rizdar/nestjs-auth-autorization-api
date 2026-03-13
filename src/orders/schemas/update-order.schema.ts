import { z } from 'zod';

export const UpdateOrderStatusSchema = z.object({
  status: z.enum(['PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
});

export type UpdateOrderStatusDto = z.infer<typeof UpdateOrderStatusSchema>;
