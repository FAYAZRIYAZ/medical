import Razorpay from 'razorpay';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const razorpay = env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET
  ? new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET })
  : null;

class RazorpayService {
  async createOrder(amount: number, currency = 'INR', receiptId: string) {
    if (!razorpay) {
      logger.warn('[Razorpay STUB] Would create order', { amount, currency });
      return { id: `stub_order_${Date.now()}`, amount: amount * 100, currency, receipt: receiptId };
    }
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency,
      receipt: receiptId,
      payment_capture: true,
    });
    return order;
  }

  verifySignature(orderId: string, paymentId: string, signature: string): boolean {
    if (!env.RAZORPAY_KEY_SECRET) return true; // stub mode
    const body = `${orderId}|${paymentId}`;
    const expected = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');
    return expected === signature;
  }

  verifyWebhook(body: string, signature: string): boolean {
    if (!env.RAZORPAY_WEBHOOK_SECRET) return true;
    const expected = crypto
      .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');
    return expected === signature;
  }
}

export const razorpayService = new RazorpayService();
