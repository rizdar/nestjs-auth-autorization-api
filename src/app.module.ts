import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { LoggerModule } from './logger/logger.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import mailConfig from './config/mail-config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [appConfig, databaseConfig, jwtConfig, mailConfig],
    }),
    PrismaModule,
    LoggerModule,
    UsersModule,
    AuthModule,
    MailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
