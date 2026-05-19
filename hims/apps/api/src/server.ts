import 'express-async-errors';
import express from 'express';
import { createServer } from 'http';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import morgan from 'morgan';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter.js';
import { ExpressAdapter } from '@bull-board/express';
import * as Sentry from '@sentry/node';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';

import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { connectRedis } from './config/redis.js';
import { logger } from './config/logger.js';
import { initSocket } from './integrations/socket.js';
import { verifyEmailConnection } from './integrations/email.js';
import { allQueues } from './jobs/queues.js';
import './jobs/workers.js';

import { globalRateLimit } from './middleware/rateLimiter.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

// Route imports
import authRoutes from './modules/auth/auth.routes.js';
import patientRoutes from './modules/patients/patient.routes.js';
import doctorRoutes from './modules/doctors/doctor.routes.js';
import departmentRoutes from './modules/departments/department.routes.js';
import appointmentRoutes from './modules/appointments/appointment.routes.js';
import encounterRoutes from './modules/encounters/encounter.routes.js';
import prescriptionRoutes from './modules/prescriptions/prescription.routes.js';
import ipdRoutes from './modules/ipd/ipd.routes.js';
import pharmacyRoutes from './modules/pharmacy/pharmacy.routes.js';
import labRoutes from './modules/lab/lab.routes.js';
import billingRoutes from './modules/billing/billing.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import telemedicineRoutes from './modules/telemedicine/telemedicine.routes.js';
import notificationRoutes from './modules/notifications/notification.routes.js';
import chatRoutes from './modules/chat/chat.routes.js';

// Sentry initialization
if (env.SENTRY_DSN) {
  Sentry.init({ dsn: env.SENTRY_DSN, environment: env.NODE_ENV });
}

const app = express();
const httpServer = createServer(app);

// ── Security Middleware ──────────────────────────────────────────────────────
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", env.CLIENT_URL],
      frameSrc: ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
}));

app.use(cors({
  origin: [env.CLIENT_URL, 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id', 'X-Idempotency-Key'],
}));

app.use(hpp());
app.use(mongoSanitize());

// ── Parsing Middleware ───────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(env.COOKIE_SECRET));

// ── Logging ──────────────────────────────────────────────────────────────────
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev', {
  stream: { write: (message) => logger.info(message.trim()) },
}));

// ── Rate Limiting ────────────────────────────────────────────────────────────
app.use(globalRateLimit);

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// ── BullBoard ─────────────────────────────────────────────────────────────────
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');
createBullBoard({
  queues: allQueues.map((q) => new BullMQAdapter(q)) as unknown as Parameters<typeof createBullBoard>[0]['queues'],
  serverAdapter,
});
app.use('/admin/queues', (req, res, next) => {
  const auth = req.headers.authorization;
  const expected = 'Basic ' + Buffer.from(`${env.BULL_BOARD_USERNAME}:${env.BULL_BOARD_PASSWORD}`).toString('base64');
  if (auth !== expected) {
    res.setHeader('WWW-Authenticate', 'Basic realm="BullBoard"');
    res.status(401).send('Unauthorized');
    return;
  }
  next();
}, serverAdapter.getRouter());

// ── Swagger ───────────────────────────────────────────────────────────────────
const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'HIMS API', version: '1.0.0', description: 'Hospital Information & Management System API' },
    servers: [{ url: `/api/${env.API_VERSION}` }],
    components: {
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/modules/**/*.routes.ts'],
});
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));

// ── API Routes ────────────────────────────────────────────────────────────────
const API = `/api/${env.API_VERSION}`;
app.use(`${API}/auth`, authRoutes);
app.use(`${API}/patients`, patientRoutes);
app.use(`${API}/doctors`, doctorRoutes);
app.use(`${API}/departments`, departmentRoutes);
app.use(`${API}/appointments`, appointmentRoutes);
app.use(`${API}/encounters`, encounterRoutes);
app.use(`${API}/prescriptions`, prescriptionRoutes);
app.use(`${API}/ipd`, ipdRoutes);
app.use(`${API}/pharmacy`, pharmacyRoutes);
app.use(`${API}/lab`, labRoutes);
app.use(`${API}/billing`, billingRoutes);
app.use(`${API}/dashboard`, dashboardRoutes);
app.use(`${API}/telemedicine`, telemedicineRoutes);
app.use(`${API}/notifications`, notificationRoutes);
app.use(`${API}/chat`, chatRoutes);

// ── 404 + Error Handler ───────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Startup ────────────────────────────────────────────────────────────────────
async function start(): Promise<void> {
  try {
    await connectDatabase();
  } catch (err) {
    logger.error('Failed to connect to MongoDB — cannot start', { error: String(err) });
    process.exit(1);
  }

  // Redis is optional — server starts without it (cache/queues disabled)
  await connectRedis();

  // Email is optional — server starts without it (email sending disabled)
  try {
    await verifyEmailConnection();
  } catch (err) {
    logger.warn('Email service unavailable — emails will not be sent', { error: String(err) });
  }

  initSocket(httpServer);

  httpServer.listen(env.PORT, () => {
    logger.info(`🏥 HIMS API running on port ${env.PORT} [${env.NODE_ENV}]`);
    logger.info(`📚 Swagger: http://localhost:${env.PORT}/api/docs`);
    logger.info(`🎯 BullBoard: http://localhost:${env.PORT}/admin/queues`);
  });
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason });
});

await start();
