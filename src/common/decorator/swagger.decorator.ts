import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';

export function Auth() {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiUnauthorizedResponse({ description: 'Unauthorized' }),
    ApiForbiddenResponse({ description: 'Forbidden - insufficient role' }),
  );
}
