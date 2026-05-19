import nodemailer from 'nodemailer';
import Handlebars from 'handlebars';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
});

const TEMPLATES: Record<string, { subject: string; html: string }> = {
  otp: {
    subject: 'Your OTP for HIMS login',
    html: `<p>Hi,</p><p>Your OTP is: <strong>{{otp}}</strong></p><p>Valid for 5 minutes.</p>`,
  },
  'email-verification': {
    subject: 'Verify your email — HIMS',
    html: `<p>Hi {{name}},</p><p>Click below to verify your email:</p><p><a href="{{verifyUrl}}">Verify Email</a></p>`,
  },
  'password-reset': {
    subject: 'Reset your password — HIMS',
    html: `<p>Hi {{name}},</p><p>Click below to reset your password (valid 15 minutes):</p><p><a href="{{resetUrl}}">Reset Password</a></p><p>If you didn't request this, ignore this email.</p>`,
  },
  'appointment-booked': {
    subject: 'Appointment Confirmed — HIMS',
    html: `<p>Hi {{patientName}},</p><p>Your appointment with <strong>Dr. {{doctorName}}</strong> is confirmed for <strong>{{date}} at {{time}}</strong>.</p><p>Token #: {{tokenNumber}}</p>`,
  },
  'appointment-reminder': {
    subject: 'Reminder: Appointment Tomorrow',
    html: `<p>Hi {{patientName}},</p><p>Reminder: You have an appointment with Dr. {{doctorName}} tomorrow at {{time}}.</p>`,
  },
  'lab-report-ready': {
    subject: 'Your Lab Report is Ready — HIMS',
    html: `<p>Hi {{patientName}},</p><p>Your lab report for {{testName}} is ready. Please login to download.</p>`,
  },
  'payment-receipt': {
    subject: 'Payment Receipt — HIMS',
    html: `<p>Hi {{patientName}},</p><p>Payment of ₹{{amount}} received against Invoice #{{invoiceNumber}}. Thank you!</p>`,
  },
};

export async function sendEmail(to: string, templateName: string, variables: Record<string, string>): Promise<void> {
  const template = TEMPLATES[templateName];
  if (!template) {
    logger.warn('Email template not found', { templateName });
    return;
  }

  const htmlTemplate = Handlebars.compile(template.html);
  const subjectTemplate = Handlebars.compile(template.subject);

  try {
    await transporter.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject: subjectTemplate(variables),
      html: htmlTemplate(variables),
    });
    logger.info('Email sent', { to, template: templateName });
  } catch (err) {
    logger.error('Email send failed', { to, template: templateName, error: String(err) });
  }
}

export async function verifyEmailConnection(): Promise<void> {
  try {
    await transporter.verify();
    logger.info('Email transport verified');
  } catch (err) {
    logger.warn('Email transport not ready', { error: String(err) });
  }
}
