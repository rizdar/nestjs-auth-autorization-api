import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LoggerModule } from 'src/logger/logger.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}), // secret dikonfigurasi per-call di service
    UsersModule,
    LoggerModule,
    PrismaModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
