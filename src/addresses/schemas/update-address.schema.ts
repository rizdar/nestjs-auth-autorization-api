import { z } from 'zod';

export const UpdateAddressSchema = z
  .object({
    label: z.string().min(1).optional(),
    recipientName: z.string().min(2).optional(),
    phone: z.string().min(8).optional(),
    address: z.string().min(5).optional(),
    city: z.string().min(2).optional(),
    province: z.string().min(2).optional(),
    postalCode: z.string().min(5).optional(),
    isDefault: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export type UpdateAddressDto = z.infer<typeof UpdateAddressSchema>;
