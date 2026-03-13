import {
  Controller,
  Get,
  UseGuards,
  NotFoundException,
  Patch,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Auth } from 'src/common/decorator/swagger.decorator';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorator/roles-decorator';
import { Role } from 'generated/prisma/enums';
import { ZodValidationPipe } from 'nestjs-zod';
import {
  type UpdateProfileDto,
  UpdateProfileSchema,
} from './schemas/update-profile.schema';
import {
  type ChangePasswordDto,
  ChangePasswordSchema,
} from './schemas/change-password.schema';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard) // ← semua endpoint di sini butuh auth
@Auth() // ← semua endpoint di sini butuh auth (Swagger)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @Auth()
  @ApiOperation({ summary: 'Get current logged in user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@CurrentUser() user: { sub: number; email: string }) {
    const profile = await this.usersService.findById(user.sub);
    if (!profile) throw new NotFoundException('User not found');
    const { password, ...result } = profile;
    return result;
  }

  @Get('all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN) // ← hanya ADMIN yang bisa akses
  @Auth()
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of all users' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getAllUsers() {
    return await this.usersService.findAll();
  }

  // ─── Update Profile ───────────────────────────────────────────
  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiBody({
    schema: {
      example: {
        name: 'John Updated',
        email: 'john.updated@example.com',
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({
    status: 400,
    description: 'Email already used / Validation failed',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateProfile(
    @CurrentUser() user: { sub: number },
    @Body(new ZodValidationPipe(UpdateProfileSchema)) dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.sub, dto);
  }

  // ─── Change Password ──────────────────────────────────────────
  @Patch('me/change-password')
  @ApiOperation({ summary: 'Change current user password' })
  @ApiBody({
    schema: {
      example: {
        currentPassword: 'OldPassword123',
        newPassword: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({
    status: 400,
    description: 'Wrong current password / Validation failed',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async changePassword(
    @CurrentUser() user: { sub: number },
    @Body(new ZodValidationPipe(ChangePasswordSchema)) dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(user.sub, dto);
  }
}
