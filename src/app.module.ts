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
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { AddressesModule } from './addresses/addresses.module';
import { PaymentsModule } from './payments/payments.module';
import { ReviewsModule } from './reviews/reviews.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [appConfig, databaseConfig, jwtConfig, mailConfig],
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 detik
        limit: 3, // max 3 request per detik
      },
      {
        name: 'medium',
        ttl: 10000, // 10 detik
        limit: 10, // max 10 request per 10 detik
      },
      {
        name: 'long',
        ttl: 60000, // 1 menit
        limit: 30, // max 30 request per menit
      },
    ]),
    PrismaModule,
    LoggerModule,
    UsersModule,
    AuthModule,
    MailModule,
    CategoriesModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    AddressesModule,
    PaymentsModule,
    ReviewsModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: 'APP_GUARD', useClass: ThrottlerGuard }],
})
export class AppModule {}
