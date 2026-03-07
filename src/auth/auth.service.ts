import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { LoggerService } from '../logger/logger.service';
import { RegisterDto } from './schemas/register.schema';
import { LoginDto } from './schemas/login.schema';
import { ForgotPasswordDto } from './schemas/forgot-password.schema';
import { ResetPasswordDto } from './schemas/reset-password.schema';
import { RefreshTokenDto } from './schemas/refresh-token.schema';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
    private readonly mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    this.logger.log(`Register attempt for email: ${dto.email}`, 'AuthService');

    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      this.logger.warn(`Email already exists: ${dto.email}`, 'AuthService');
      throw new BadRequestException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await this.usersService.create({
      email: dto.email,
      name: dto.name,
      password: hashedPassword,
    });

    this.logger.log(`User registered successfully: ${user.id}`, 'AuthService');

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      user: { id: user.id, email: user.email, name: user.name },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    this.logger.log(`Login attempt for email: ${dto.email}`, 'AuthService');

    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      this.logger.warn(
        `Login failed - user not found: ${dto.email}`,
        'AuthService',
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      this.logger.warn(
        `Login failed - wrong password: ${dto.email}`,
        'AuthService',
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.log(`User logged in successfully: ${user.id}`, 'AuthService');

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    return {
      user: { id: user.id, email: user.email, name: user.name },
      ...tokens,
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    this.logger.log('Refresh token attempt', 'AuthService');

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: dto.refreshToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.isRevoked) {
      this.logger.warn('Refresh token invalid or revoked', 'AuthService');
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (new Date() > storedToken.expiresAt) {
      this.logger.warn('Refresh token expired', 'AuthService');
      throw new UnauthorizedException('Refresh token expired');
    }

    // Revoke token lama
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    const tokens = await this.generateTokens(
      storedToken.user.id,
      storedToken.user.email,
      storedToken.user.role,
    );
    await this.saveRefreshToken(storedToken.user.id, tokens.refreshToken);

    this.logger.log(
      `Tokens refreshed for user: ${storedToken.user.id}`,
      'AuthService',
    );

    return tokens;
  }

  // ─── Forgot Password ─────────────────────────────────────────
  async forgotPassword(dto: ForgotPasswordDto) {
    this.logger.log(`Forgot password request for: ${dto.email}`, 'AuthService');

    const user = await this.usersService.findByEmail(dto.email);

    // Selalu return pesan sukses meski email tidak ditemukan (security best practice)
    if (!user) {
      this.logger.warn(
        `Forgot password - email not found: ${dto.email}`,
        'AuthService',
      );
      return { message: 'If the email exists, a reset link has been sent' };
    }

    // Hapus token lama yang belum dipakai
    await this.prisma.passwordReset.deleteMany({
      where: { userId: user.id, isUsed: false },
    });

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 jam

    await this.prisma.passwordReset.create({
      data: { token: resetToken, userId: user.id, expiresAt },
    });

    await this.mailService.sendPasswordReset(user.email, user.name, resetToken);
    this.logger.log(
      `Password reset email sent to: ${user.email}`,
      'AuthService',
    );
    return { message: 'If the email exists, a reset link has been sent' };
  }

  // ─── Reset Password ──────────────────────────────────────────
  async resetPassword(dto: ResetPasswordDto) {
    this.logger.log('Reset password attempt', 'AuthService');

    const resetRecord = await this.prisma.passwordReset.findUnique({
      where: { token: dto.token },
      include: { user: true },
    });

    if (!resetRecord || resetRecord.isUsed) {
      this.logger.warn('Reset token invalid or already used', 'AuthService');
      throw new NotFoundException('Invalid or expired reset token');
    }

    if (new Date() > resetRecord.expiresAt) {
      this.logger.warn('Reset token expired', 'AuthService');
      throw new BadRequestException('Reset token has expired');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    await this.usersService.updateById(resetRecord.userId, {
      password: hashedPassword,
    });

    await this.prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: { isUsed: true },
    });

    // Revoke semua refresh token user ini
    await this.prisma.refreshToken.updateMany({
      where: { userId: resetRecord.userId },
      data: { isRevoked: true },
    });

    this.logger.log(
      `Password reset successful for user: ${resetRecord.userId}`,
      'AuthService',
    );

    return { message: 'Password has been reset successfully' };
  }

  // ─── Logout ──────────────────────────────────────────────────
  async logout(userId: number) {
    this.logger.log(`Logout for user: ${userId}`, 'AuthService');

    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });

    return { message: 'Logged out successfully' };
  }

  // ─── Helpers ─────────────────────────────────────────────────
  private async generateTokens(userId: number, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.accessSecret'),
        expiresIn: this.configService.get<string>('jwt.accessExpiresIn') as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<string>(
          'jwt.refreshExpiresIn',
        ) as any,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(userId: number, token: string) {
    const expiresAt = new Date(
      Date.now() +
        this.parseExpiry(
          this.configService.get<string>('jwt.refreshExpiresIn')!,
        ),
    );

    await this.prisma.refreshToken.create({
      data: { token, userId, expiresAt },
    });
  }

  private parseExpiry(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1));
    const map = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return value * (map[unit] || 1000);
  }
}
