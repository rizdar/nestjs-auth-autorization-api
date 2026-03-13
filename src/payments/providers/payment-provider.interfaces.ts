export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  message: string;
}

export interface PaymentProvider {
  processPayment(orderId: number, amount: number): Promise<PaymentResult>;
}

export const PAYMENT_PROVIDER = 'PAYMENT_PROVIDER';
