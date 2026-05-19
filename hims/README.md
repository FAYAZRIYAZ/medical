# HIMS — Hospital Information & Management System

A production-grade, multi-tenant Hospital Information & Patient Management System built as a full-stack TypeScript monorepo.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TypeScript, TanStack Query v5, Zustand, Tailwind CSS, shadcn/ui, Framer Motion |
| Backend | Node.js 20, Express 4, TypeScript, MongoDB 7 (Mongoose), Redis 7 (IORedis), BullMQ |
| Auth | JWT (access 15min + refresh 7d rotated), Argon2id, TOTP 2FA, Google OAuth, OTP SMS |
| Real-time | Socket.IO with Redis adapter |
| Storage | MinIO / Cloudinary / S3 (configurable adapter) |
| PDF | PDFKit for prescriptions, discharge summaries, lab reports |
| Payments | Razorpay + Stripe |
| Video | LiveKit for telemedicine |
| DevOps | Docker Compose, pnpm workspaces |

## Monorepo Structure

```
hims/
├── apps/
│   ├── api/          # Express REST API
│   └── web/          # React SPA
├── packages/
│   └── shared/       # Shared schemas, types, constants
├── infra/
│   ├── docker/       # MongoDB init scripts
│   └── nginx/        # Nginx config
├── docker-compose.yml
└── Makefile
```

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose

### 1. Clone and install

```bash
git clone <repo-url> hims
cd hims
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Start with Docker (recommended)

```bash
make docker-up    # Start MongoDB, Redis, MinIO, Mailhog
make dev          # Start API and web in development mode
```

Or start all services including the app:

```bash
docker compose up -d
```

### 4. Seed the database

```bash
make seed
```

This creates:
- Super admin tenant + user
- City General Hospital tenant + admin
- 8 departments, 3 doctors, 6 staff users
- 5 patients, 5 appointments
- 8 drugs with stock, 10 lab tests
- 4 wards + beds, 1 sample invoice

### 5. Access the app

| Service | URL | Credentials |
|---------|-----|-------------|
| Web App | http://localhost:3000 | See below |
| API | http://localhost:4000 | — |
| API Docs (Swagger) | http://localhost:4000/api-docs | — |
| BullMQ Board | http://localhost:4000/admin/queues | admin / bull_board_password |
| MinIO Console | http://localhost:9001 | minioadmin / minioadmin |
| Mailhog (SMTP) | http://localhost:8025 | — |

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@citygeneral.in | Admin@123 |
| Doctor | dr.mehta@citygeneral.in | User@1234 |
| Patient | rahul.verma@email.com | Patient@123 |
| Pharmacist | pharmacist@citygeneral.in | User@1234 |
| Lab Tech | labtech@citygeneral.in | User@1234 |

## Scripts

```bash
pnpm dev              # Start both api and web in dev mode
pnpm build            # Build all packages
pnpm lint             # Lint all packages
pnpm typecheck        # Type check all packages

make seed             # Seed the database
make docker-up        # Start infrastructure containers
make docker-down      # Stop infrastructure containers
make setup            # Install deps + start docker + seed
```

## Roles & Permissions

11 roles with fine-grained RBAC + ABAC:

- `super_admin` — Platform-level, manages tenants
- `hospital_admin` — Full hospital management
- `doctor` — Clinical workflows, prescriptions, encounters
- `nurse` — Vitals, IPD care
- `receptionist` — Appointments, patient check-in
- `pharmacist` — Drug inventory, dispensing
- `lab_technician` — Lab orders, results
- `radiologist` — Radiology orders
- `accountant` — Billing, invoices, payments
- `patient` — Own records, appointments, reports
- `ambulance_driver` — Emergency coordination

## API Documentation

Full Swagger UI available at `/api-docs` when the API server is running.

## Environment Variables

See [`.env.example`](.env.example) for the full list of required environment variables with descriptions.

## Security

- JWT access tokens (15min) + refresh tokens (7d) stored in httpOnly cookies
- Argon2id password hashing
- Account lockout after 5 failed attempts (Redis-backed, 30min)
- TOTP 2FA support (Google Authenticator compatible)
- Helmet security headers (HSTS, CSP, X-Frame-Options)
- Redis-backed rate limiting (global, login, OTP, password reset)
- Mongo sanitization (express-mongo-sanitize)
- HTTP Parameter Pollution protection (hpp)
- MIME-type validated file uploads
- Sensitive fields redacted in logs

## License

MIT
