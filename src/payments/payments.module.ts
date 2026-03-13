import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SimulationProvider } from './providers/simulation.provider';

@Module({
  imports: [PrismaModule],
  providers: [
    PaymentsService,
    { provide: 'PAYMENT_PROVIDER', useClass: SimulationProvider },
  ],
  controllers: [PaymentsController],
})
export class PaymentsModule {}
