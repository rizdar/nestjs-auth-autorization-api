import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../logger/logger.service';
import { User } from '../../generated/prisma/client';
import { ChangePasswordDto } from './schemas/change-password.schema';
import bcrypt from 'bcrypt';
import { UpdateProfileDto } from './schemas/update-profile.schema';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    this.logger.debug(`Finding user by email: ${email}`, 'UsersService');
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: number): Promise<User | null> {
    this.logger.debug(`Finding user by id: ${id}`, 'UsersService');
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(data: {
    email: string;
    name: string;
    password: string;
    emailVerificationToken?: string;
    emailVerificationExpiry?: Date;
  }): Promise<User> {
    this.logger.log(
      `Creating new user with email: ${data.email}`,
      'UsersService',
    );
    return this.prisma.user.create({ data });
  }

  async updateById(id: number, data: Partial<User>): Promise<User> {
    this.logger.log(`Updating user id: ${id}`, 'UsersService');
    return this.prisma.user.update({ where: { id }, data });
  }

  async findAll() {
    this.logger.log('Fetching all users', 'UsersService');
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
        // password tidak ikut
      },
    });
    return users;
  }

  // ─── Update Profile ───────────────────────────────────────────
  async updateProfile(userId: number, dto: UpdateProfileDto) {
    this.logger.log(`Update profile for user: ${userId}`, 'UsersService');

    // Kalau ganti email, cek apakah email sudah dipakai
    if (dto.email) {
      const existingUser = await this.findByEmail(dto.email);
      if (existingUser && existingUser.id !== userId) {
        this.logger.warn(`Email already used: ${dto.email}`, 'UsersService');
        throw new BadRequestException('Email already used by another account');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...dto,
        // Kalau ganti email, reset verifikasi
        ...(dto.email && { isEmailVerified: false }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    this.logger.log(`Profile updated for user: ${userId}`, 'UsersService');
    return updated;
  }

  // ─── Change Password ──────────────────────────────────────────
  async changePassword(userId: number, dto: ChangePasswordDto) {
    this.logger.log(`Change password for user: ${userId}`, 'UsersService');

    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    // Cek current password
    const isPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      this.logger.warn(
        `Wrong current password for user: ${userId}`,
        'UsersService',
      );
      throw new BadRequestException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Revoke semua refresh token — user harus login ulang
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });

    this.logger.log(`Password changed for user: ${userId}`, 'UsersService');

    return { message: 'Password changed successfully. Please login again.' };
  }
}
