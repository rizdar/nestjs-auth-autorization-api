import { z } from 'zod';

export const CreateAddressSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  recipientName: z
    .string()
    .min(2, 'Recipient name must be at least 2 characters'),
  phone: z.string().min(8, 'Invalid phone number'),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  city: z.string().min(2, 'City is required'),
  province: z.string().min(2, 'Province is required'),
  postalCode: z.string().min(5, 'Invalid postal code'),
  isDefault: z.boolean().default(false),
});

export type CreateAddressDto = z.infer<typeof CreateAddressSchema>;
