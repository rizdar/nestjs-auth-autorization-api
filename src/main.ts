import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port');
  const appName = configService.get<string>('app.name');

  const config = new DocumentBuilder()
    .setTitle(appName!)
    .setDescription('API Documentation')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        in: 'header',
      },
      'access-token', // ← nama reference, dipakai di decorator nanti
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // ← token tidak hilang saat refresh
    },
  });

  await app.listen(port ?? 3000);
  console.log(`🚀 App running on http://localhost:${port}`);
  console.log(`📄 Swagger docs: http://localhost:${port}/api/docs`);
}
bootstrap();
