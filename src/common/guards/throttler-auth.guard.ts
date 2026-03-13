import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class ThrottlerAuthGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Track berdasarkan IP address
    return req.ip ?? req.headers['x-forwarded-for'] ?? 'unknown';
  }

  protected errorMessage = 'Too many requests. Please try again later.';
}
