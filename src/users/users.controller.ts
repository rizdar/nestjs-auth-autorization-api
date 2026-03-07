import { Controller, Get, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Auth } from 'src/common/decorator/swagger.decorator';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorator/roles-decorator';
import { Role } from 'generated/prisma/enums';

@ApiTags('Users')
@Controller('users')
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
}
