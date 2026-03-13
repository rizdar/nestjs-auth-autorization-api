import { Injectable } from '@nestjs/common';

import { v4 as uuidv4 } from 'uuid';
import { PaymentProvider, PaymentResult } from './payment-provider.interfaces';

@Injectable()
export class SimulationProvider implements PaymentProvider {
  async processPayment(
    orderId: number,
    amount: number,
  ): Promise<PaymentResult> {
    // Simulasi delay network (500ms)
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Simulasi success rate 95% — realistis seperti payment gateway asli
    const isSuccess = Math.random() > 0.05;

    if (!isSuccess) {
      return {
        success: false,
        message: 'Payment failed. Please try again.',
      };
    }

    return {
      success: true,
      transactionId: `SIM-${uuidv4()}`,
      message: 'Payment successful',
    };
  }
}
