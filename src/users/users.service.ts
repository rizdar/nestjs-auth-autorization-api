import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../logger/logger.service';
import { User } from '../../generated/prisma/client';

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
}
