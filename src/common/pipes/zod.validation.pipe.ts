import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { type ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    if (metadata.type !== 'body') return value;

    const result = this.schema.safeParse(value);

    if (!result.success) {
      const errors = result.error.issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      throw new BadRequestException({
        message: 'Validation failed',
        errors,
      });
    }

    return result.data;
  }
}
