import twilio from 'twilio';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

let twilioClient: ReturnType<typeof twilio> | null = null;

if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
}

export async function sendSMS(to: string, message: string): Promise<void> {
  if (!twilioClient || !env.TWILIO_PHONE_NUMBER) {
    logger.warn('[SMS STUB] Would send SMS', { to, message: message.slice(0, 50) });
    return;
  }
  try {
    await twilioClient.messages.create({ from: env.TWILIO_PHONE_NUMBER, to, body: message });
    logger.info('SMS sent', { to: to.replace(/\d(?=\d{4})/g, '*') });
  } catch (err) {
    logger.error('SMS send failed', { error: String(err) });
  }
}

export async function sendWhatsApp(to: string, message: string): Promise<void> {
  if (!twilioClient || !env.TWILIO_WHATSAPP_FROM) {
    logger.warn('[WhatsApp STUB] Would send WhatsApp', { to, message: message.slice(0, 50) });
    return;
  }
  try {
    await twilioClient.messages.create({
      from: env.TWILIO_WHATSAPP_FROM,
      to: `whatsapp:${to}`,
      body: message,
    });
    logger.info('WhatsApp message sent', { to: to.replace(/\d(?=\d{4})/g, '*') });
  } catch (err) {
    logger.error('WhatsApp send failed', { error: String(err) });
  }
}

export async function sendOtpSms(phone: string, otp: string): Promise<void> {
  const message = `Your HIMS OTP is ${otp}. Valid for 5 minutes. Do not share with anyone.`;
  await sendSMS(phone, message);
}

export async function sendOtpWhatsApp(phone: string, otp: string): Promise<void> {
  const message = `Your HIMS OTP is *${otp}*. Valid for 5 minutes. Do not share with anyone.`;
  await sendWhatsApp(phone, message);
}
