import { Module } from '@nestjs/common';
import { UsersService } from './users.service';

import { LoggerModule } from 'src/logger/logger.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UsersController } from './users.controller';

@Module({
  imports: [PrismaModule, LoggerModule],

  providers: [UsersService],
  exports: [UsersService],
  controllers: [UsersController],
})
export class UsersModule {}
