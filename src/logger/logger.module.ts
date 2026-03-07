import { Global, Module } from '@nestjs/common';
import {
  WinstonModule,
  utilities as nestWinstonModuleUtilities,
} from 'nest-winston';
import * as winston from 'winston';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerService } from './logger.service';

@Global()
@Module({
  imports: [
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transports: [
          // Console log (development)
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.ms(),
              nestWinstonModuleUtilities.format.nestLike(
                configService.get('app.name'),
                { prettyPrint: true, colors: true },
              ),
            ),
          }),

          // File log - semua level (production)
          new winston.transports.File({
            filename: 'logs/combined.log',
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.json(),
            ),
          }),

          // File log - error saja
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.json(),
            ),
          }),
        ],
      }),
    }),
  ],
  providers: [LoggerService],
  exports: [LoggerService, WinstonModule],
})
export class LoggerModule {}
