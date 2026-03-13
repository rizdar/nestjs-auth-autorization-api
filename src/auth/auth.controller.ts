import {
  Controller,
  Post,
  Body,
  UsePipes,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
  Query,
  Get,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';

import { RegisterSchema, type RegisterDto } from './schemas/register.schema';
import { LoginSchema, type LoginDto } from './schemas/login.schema';
import {
  ForgotPasswordSchema,
  type ForgotPasswordDto,
} from './schemas/forgot-password.schema';
import {
  ResetPasswordSchema,
  type ResetPasswordDto,
} from './schemas/reset-password.schema';
import {
  RefreshTokenSchema,
  type RefreshTokenDto,
} from './schemas/refresh-token.schema';

import { ZodValidationPipe } from 'src/common/pipes/zod.validation.pipe';
import { Auth } from 'src/common/decorator/swagger.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ThrottlerAuthGuard } from 'src/common/guards/throttler-auth.guard';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import {
  type ResendVerificationDto,
  ResendVerificationSchema,
} from './schemas/resend-verifycation.schema';

@ApiTags('Auth')
@Controller('auth')
@UseGuards(ThrottlerAuthGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @UsePipes(new ZodValidationPipe(RegisterSchema))
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({
    schema: {
      example: {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      },
    },
  })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({
    status: 400,
    description: 'Email already registered / Validation failed',
  })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @UsePipes(new ZodValidationPipe(LoginSchema))
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({
    schema: {
      example: {
        email: 'john@example.com',
        password: 'Password123',
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle()
  @UsePipes(new ZodValidationPipe(RefreshTokenSchema))
  @ApiOperation({ summary: 'Get new access token using refresh token' })
  @ApiBody({
    schema: {
      example: { refreshToken: 'your-refresh-token-here' },
    },
  })
  @ApiResponse({ status: 200, description: 'Tokens refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { ttl: 60000, limit: 3 } })
  @UsePipes(new ZodValidationPipe(ForgotPasswordSchema))
  @ApiOperation({ summary: 'Request password reset link' })
  @ApiBody({
    schema: {
      example: { email: 'john@example.com' },
    },
  })
  @ApiResponse({ status: 200, description: 'Reset link sent if email exists' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { ttl: 60000, limit: 3 } })
  @UsePipes(new ZodValidationPipe(ResetPasswordSchema))
  @ApiOperation({ summary: 'Reset password using token' })
  @ApiBody({
    schema: {
      example: {
        token: 'reset-token-from-email',
        password: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Auth()
  @ApiOperation({ summary: 'Logout and revoke all refresh tokens' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  logout(@Req() req: any) {
    return this.authService.logout(req.user.sub);
  }

  @Get('verify-email')
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Verify email address using token' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail({ token });
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { ttl: 60000, limit: 3 } })
  @UsePipes(new ZodValidationPipe(ResendVerificationSchema))
  @ApiOperation({ summary: 'Resend email verification link' })
  @ApiBody({
    schema: {
      example: { email: 'john@example.com' },
    },
  })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  @ApiResponse({ status: 400, description: 'Email already verified' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto);
  }
}
