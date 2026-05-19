# MASTER PROMPT — Advanced Hospital & Patient Management System (HIMS)

**Version:** 2.0 — Production-grade
**Target:** AI coding agent (Claude Code, Cursor, Windsurf, etc.)
**Goal:** Generate a complete, deployable, real-world hospital management platform — not a demo.

---

## 0. PROJECT BRIEF

Build a full-stack, multi-tenant **Hospital Information & Patient Management System (HIMS)** that real clinics, polyclinics, and small-to-mid-size hospitals can deploy and operate. The product must cover the **complete clinical, administrative, and financial workflow** of a hospital — OPD, IPD, Emergency, Pharmacy, Lab, Radiology, Billing, Insurance, and Telemedicine.

The system must be:

- **Production-ready** — no TODOs, no stubs, no placeholder logic
- **Multi-tenant** — one deployment can serve multiple hospitals/clinics (tenant isolation)
- **Role-secure** — strict RBAC + per-resource ABAC where needed
- **Observable** — structured logs, error tracking
- **Documented** — README, API docs (Swagger), ER diagram, deployment guide
- **Responsive** — mobile-first, PWA-installable, tablet-optimized for reception/nursing stations
- **Internationalized** — i18n scaffolding (English + Hindi), INR + USD currency, IST + UTC timezone handling

---

## 1. TECH STACK (LOCKED)

### Frontend
- **React 18** + **Vite** + **TypeScript** (strict mode)
- **React Router v6** (data routers, loaders)
- **TanStack Query (React Query) v5** — server state, caching, optimistic updates
- **Zustand** — lightweight client state (auth, UI, theme)
- **Tailwind CSS v3** + **shadcn/ui** component primitives
- **React Hook Form** + **Zod** (shared schemas with backend)
- **Framer Motion** — purposeful motion only, no decorative bounce
- **Axios** with interceptors (auth, refresh, error normalization)
- **Socket.IO client** — chat, live queue, notifications
- **FullCalendar** — appointment calendar
- **Recharts** — dashboards
- **@react-pdf/renderer** — prescription/invoice PDFs in-browser
- **react-i18next** — internationalization
- **dayjs** with timezone plugin
- **LiveKit** (self-hostable, open source) for video — primary; adapter pattern lets ZegoCloud/Agora swap via env

### Backend
- **Node.js 20 LTS** + **Express 4** + **TypeScript** (strict)
- **MongoDB 7** via **Mongoose 8**
- **Redis 7** — sessions, rate limit, cache, BullMQ queues
- **BullMQ** — background jobs (notifications, PDF gen, report processing)
- **JWT (access + refresh)** with rotation; refresh tokens stored hashed in Redis
- **Argon2id** for password hashing (current best practice over bcrypt)
- **Zod** for validation (shared with frontend via a `packages/shared` workspace)
- **Multer** + **Sharp** (image optimization) + **Cloudinary** SDK (or S3-compatible MinIO for self-hosted option)
- **Nodemailer** for transactional email
- **Twilio** (WhatsApp Business API + SMS) + **MSG91** adapter (cheaper for India) — adapter pattern
- **Socket.IO** with Redis adapter for horizontal scaling
- **Helmet**, **express-rate-limit**, **express-mongo-sanitize**, **hpp**, **cors**
- **Winston** + **morgan** → structured JSON logs
- **Sentry** SDK wired up for error tracking
- **Swagger UI** + **swagger-jsdoc** → live API docs at `/api/docs`

### Database & Storage
- **MongoDB Atlas** (cloud) or self-hosted Mongo with replica set
- **Redis Cloud** or self-hosted
- **Cloudinary** for medical images/reports OR **AWS S3 / MinIO** (configurable adapter)

### DevOps
- **Docker** + **docker-compose.yml** for local dev (app, mongo, redis, mailhog, minio)
- **GitHub Actions** CI: lint → typecheck → build → docker push
- **Frontend deploy:** Vercel
- **Backend deploy:** Render / Railway / Fly.io (specify in README)
- **Monorepo:** **pnpm workspaces** with `apps/web`, `apps/api`, `packages/shared`, `packages/ui`

---

## 2. ARCHITECTURE

### Monorepo Layout
```
hims/
├── apps/
│   ├── web/           # React + Vite frontend
│   └── api/           # Express backend
├── packages/
│   ├── shared/        # Zod schemas, types, constants shared across FE/BE
│   └── ui/            # Reusable shadcn-based component library
├── infra/
│   ├── docker/
│   └── nginx/
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── DEPLOYMENT.md
│   └── ER_DIAGRAM.png
├── .github/workflows/
├── docker-compose.yml
├── pnpm-workspace.yaml
└── README.md
```

### Backend Layered Architecture
```
src/
├── config/          # env, db, redis, logger, cloudinary
├── modules/         # feature modules (auth, patients, appointments, pharmacy, lab, ipd, billing, ...)
│   └── <module>/
│       ├── <module>.routes.ts
│       ├── <module>.controller.ts
│       ├── <module>.service.ts
│       ├── <module>.model.ts
│       └── <module>.schema.ts   # zod
├── middleware/      # auth, rbac, tenant, validate, errorHandler, rateLimit
├── jobs/            # BullMQ queues + workers
├── integrations/    # twilio, nodemailer, livekit, razorpay
├── utils/
├── types/
└── server.ts
```

**Pattern:** Controllers are thin; **services own business logic**; models are pure schema. No business logic in controllers or middleware.

---

## 3. MULTI-TENANCY

Every collection (except `tenants` and platform-level `users`) has a `tenantId` indexed field. A `tenantContext` middleware resolves tenant from JWT, and a Mongoose plugin auto-injects `tenantId` filter on all queries to prevent cross-tenant leaks.

Tenants represent: a single clinic, a hospital, or a hospital chain branch.

---

## 4. ROLES & PERMISSIONS (RBAC + ABAC)

### Roles
1. **SuperAdmin** — platform owner, manages tenants
2. **HospitalAdmin** — manages one tenant: staff, departments, finance, settings
3. **Doctor** — clinical workflow, owns own patients/consultations
4. **Nurse** — vitals, ward rounds, medication administration, IPD support
5. **Receptionist / FrontDesk** — registration, appointments, billing initiation
6. **Pharmacist** — pharmacy inventory, dispensing, stock alerts
7. **LabTechnician** — sample collection, result entry, report upload
8. **Radiologist** — imaging reports
9. **Accountant / Cashier** — billing, payments, invoices, insurance claims
10. **Patient** — own records, appointments, payments, telemedicine
11. **AmbulanceDriver** (optional, feature-flagged) — emergency dispatch

### Permission Model
- Permissions are **resource:action** strings (e.g., `appointment:create`, `prescription:sign`, `billing:refund`)
- Roles are bundles of permissions
- Custom roles per tenant supported
- ABAC layer: e.g., a Doctor can only `prescription:sign` if they are the assigned consulting doctor on that encounter

---

## 5. AUTHENTICATION

- Email/phone + password login
- **OTP login** for patients (SMS + WhatsApp)
- **JWT access token (15 min)** + **refresh token (7 days, rotated)** in httpOnly secure cookie (NOT localStorage — security upgrade over original spec)
- Optional: store non-sensitive user profile in localStorage for fast hydration
- **2FA via TOTP** (authenticator app) for admin/doctor roles
- Email verification + phone verification flows
- Password reset via signed token (15 min expiry, single-use)
- Account lockout after 5 failed attempts (Redis-backed)
- Session list + "logout all devices"
- Social login (Google) — patients only

---

## 6. CORE CLINICAL MODULES

### 6.1 Patient Registration (Master Patient Index — MPI)
- Unique Patient ID (UHID) — configurable format per tenant
- Demographics, address, emergency contacts, blood group, allergies, chronic conditions
- Photo capture (webcam)
- Government ID upload
- Insurance details (multiple policies)
- Family linkage (dependents)
- Duplicate detection (fuzzy match on name + DOB + phone)

### 6.2 OPD (Out-Patient Department)
- Appointment booking (online + walk-in)
- **Token / queue management** with live display (TV screen view)
- Doctor schedule + slot generation (configurable consult duration per doctor)
- Multi-doctor, multi-department, multi-location
- Recurring appointments
- Reschedule, cancel, no-show tracking
- Wait time analytics
- Consultation fees per doctor (in-person vs tele)
- **Visit / Encounter** record links: vitals, complaints, history, examination, diagnosis (ICD-10), prescription, follow-up

### 6.3 IPD (In-Patient Department)
- Admission workflow (planned + emergency)
- Bed/Ward management: ward types (General, Semi-private, Private, ICU, NICU), bed status (available, occupied, reserved, under maintenance)
- Bed transfer & history
- Admission notes, daily progress notes
- Doctor rounds & nursing rounds log
- Vitals chart (BP, pulse, temp, SpO2, RR) — graphable
- I/O charting (intake/output)
- Medication administration record (MAR) — what was given, when, by whom
- Diet orders linked to nutrition module
- Discharge summary generation (auto-compiled, doctor-signed)
- Length-of-stay analytics

### 6.4 Emergency / Casualty
- Triage levels (ESI 1–5)
- Quick patient registration (minimal fields)
- MLC (Medico-Legal Case) flag + police notification log
- Ambulance dispatch link

### 6.5 Operation Theatre (OT)
- OT scheduling with conflict detection
- Pre-op checklist + consent forms (e-signed by patient)
- Surgical team assignment (surgeon, anesthetist, scrub nurse, etc.)
- Procedure notes
- Post-op recovery tracking
- OT utilization report

### 6.6 Pharmacy
- Drug master (generic + brand, salt composition, schedule H/H1/X)
- Inventory: batches, expiry, stock-in/out, vendor, GST
- Auto-reorder alerts at min stock
- Dispensing against prescription (with stock deduction)
- Counter sales (non-prescription)
- Returns & wastage
- Expiry alerts (30/60/90 day)
- Vendor & purchase order workflow

### 6.7 Laboratory
- Test catalog (with sample type, container, turnaround, normal ranges, price)
- Test panels/profiles
- Sample collection workflow (barcoded)
- Result entry (with reference ranges, abnormal flag auto-detected)
- Result verification (tech → pathologist sign-off)
- Report PDF with hospital letterhead, doctor sign, QR for verification
- Auto-deliver report to patient (email + WhatsApp + portal)

### 6.8 Radiology
- Imaging order management (X-ray, USG, CT, MRI)
- DICOM file upload (basic — link to viewer like OHIF if budget allows)
- Radiologist report entry
- Report delivery

### 6.9 Blood Bank (optional, behind feature flag)
- Donor registry
- Blood stock by group & component
- Cross-match records
- Issue against requisition

### 6.10 Prescription
- Drug autocomplete from pharmacy master
- Dose, frequency, route, duration, instructions (free + structured)
- Drug-drug interaction warning (use a curated dataset; integrate with RxNorm/openFDA if available)
- Allergy check vs patient profile
- Digital signature (doctor's stored signature image)
- QR code for verification
- PDF download, print, WhatsApp send

### 6.11 Telemedicine / Video Consultation
- LiveKit-based video room created per appointment
- Pre-call device check (mic, cam, network)
- Waiting room with patient queue for doctor
- In-call: chat, screen share, file share, e-prescription on the fly
- Recording with patient consent (stored encrypted, access-logged)
- Display doctor's registration number, consent capture
- Session timeout & auto-reconnect
- Bandwidth-adaptive

### 6.12 Vaccination / Immunization
- Vaccine catalog (with schedule logic for pediatric & adult)
- Due-date calculator
- Reminders via WhatsApp/SMS/email
- Certificate generation

### 6.13 Diet / Nutrition
- Diet types per condition (diabetic, renal, cardiac, post-op)
- Meal-wise diet sheet for IPD
- Nutritionist consult notes

### 6.14 Referrals
- Internal referral (doctor → doctor)
- External referral with referral letter PDF
- Referral tracking & commission (configurable)

---

## 7. FINANCIAL MODULES

### 7.1 Billing
- Itemized billing: consultation, procedures, lab, pharmacy, room rent, surgery, etc.
- Service master with HSN/SAC codes
- **GST handling** (CGST/SGST/IGST) per item
- Package billing (e.g., maternity package, health checkup)
- Discounts (with approval matrix)
- Estimate vs final bill
- Split bills, refunds, credit notes
- Pending dues tracking

### 7.2 Payments
- **Razorpay** (India primary) + **Stripe** (international) — adapter pattern
- Cash, card, UPI, net banking, cheque, wallet
- Partial payments
- Auto-receipt generation with QR
- Payment reconciliation report

### 7.3 Insurance & TPA
- Insurance company master
- Policy capture per patient (multiple)
- Pre-authorization workflow
- Claim submission (with required documents checklist)
- Claim status tracking
- Settlement & rejection handling
- Cashless vs reimbursement flows

### 7.4 Accounting Basics
- Daily collection report
- Doctor share / revenue split
- Department-wise revenue
- Outstanding payments / aging report
- Export to Tally (XML) — India-specific

---

## 8. NOTIFICATIONS

Channels: **Email, SMS, WhatsApp, In-app (Socket.IO), Push (web push)**.

Events:
- Appointment booked / rescheduled / cancelled / reminder (24h + 1h)
- Prescription ready
- Lab report ready
- Payment success / failure / due
- Admission, discharge, OT scheduled
- Vaccination due
- Password reset, OTP, login alerts
- Insurance claim status change
- Birthday wishes (optional)

**Implementation:** All notifications go through a single `NotificationService` that queues to BullMQ; workers handle delivery + retry + DLQ. Templates editable from admin UI (Handlebars).

---

## 9. CHAT & REAL-TIME

- Doctor ↔ patient chat (persisted, with read receipts)
- Internal staff chat (department channels)
- Typing indicator, online presence, file/image share
- Push notification on new message when offline

---

## 10. DASHBOARDS

Every role gets a tailored dashboard. Minimum widgets:

### HospitalAdmin
- Live counts: today's OPD, IPD occupancy %, ER load, OT today
- Revenue: today/MTD/YTD, by department, by doctor
- Top diagnoses (ICD-10 frequency)
- Pharmacy: low stock count, expiring soon
- Lab: pending samples, TAT breach
- Outstanding receivables

### Doctor
- Today's queue (with token #), upcoming, past
- Pending prescriptions, pending lab reviews
- Earnings this month
- Patient satisfaction (if reviews enabled)

### Patient
- Upcoming appointments + join button for telemedicine
- Recent reports, prescriptions
- Outstanding bills (pay button)
- Vitals trend chart (if data exists)
- Vaccination due

### Receptionist
- Today's appointments, walk-in queue, doctor availability board, pending registrations

### Pharmacist
- Today's dispensing queue, low stock, expiring, sales summary

### LabTech
- Pending samples, pending results, today's tests

---

## 11. SEARCH, FILTERS, PAGINATION

- Global search (Cmd+K) — patients, doctors, appointments, invoices
- Server-side pagination, sorting, filtering on every list endpoint
- Mongo text indexes + optional MeiliSearch for fuzzy patient search at scale

---

## 12. LOGGING

- Application logs: Winston JSON → stdout → log aggregator (Loki/Datadog/CloudWatch — configurable)
- Request logs via Morgan (combined format in prod, dev format locally)
- Error tracking via Sentry with release tagging
- Sensitive fields (passwords, tokens, card numbers) auto-redacted in log middleware

---

## 13. SECURITY

- **All traffic HTTPS** (enforce via Helmet HSTS)
- **CSRF protection** on cookie-based auth (double-submit token)
- **Rate limiting:** global + per-route (login = 5/min/IP, OTP = 3/min/phone)
- **Input sanitization:** mongo-sanitize, xss-clean equivalent, Zod strict parsing
- **File uploads:** MIME sniff + extension check + size cap + virus scan hook (ClamAV optional)
- **Encryption at rest** for KYC documents (envelope encryption pattern)
- **Field-level encryption** for sensitive IDs (Mongoose plugin)
- **Secrets** only via env / vault; never committed; `.env.example` provided
- **Dependency scanning** in CI (npm audit)
- **OWASP Top 10** checklist documented in `SECURITY.md`

---

## 14. UI / UX REQUIREMENTS

- **Design system:** based on shadcn/ui + Tailwind. Calm, clinical, trustworthy — not flashy.
- **Color palette:** primary medical blue + supportive teal/green; high-contrast; WCAG AA minimum.
- **Dark mode** with proper contrast (not just inverted).
- **Density toggle** (comfortable / compact) — clinicians want compact tables.
- **Keyboard-first** for power users (reception, nurses): shortcuts documented, tab order correct.
- **Empty states** designed for every list/screen.
- **Loading states:** skeletons, not spinners, on data tables.
- **Error boundaries** per route + global fallback.
- **Toasts** via sonner; **modals** via Radix Dialog.
- **Tables:** TanStack Table — sortable, filterable, column visibility, CSV export.
- **Forms:** RHF + Zod; inline errors; unsaved-changes guard on navigation.
- **Print stylesheets** for prescriptions, invoices, lab reports, discharge summaries.
- **Mobile bottom nav** for patient app.
- **PWA:** installable, offline shell, background sync for queued actions.

### Public Pages
- Landing (hero, services, doctors, testimonials, stats, CTA, FAQ, footer)
- About, Services, Doctors directory, Contact, Help Center, Privacy Policy, Terms, Refund Policy
- SEO: meta tags, OG tags, sitemap, robots.txt, schema.org `MedicalOrganization` + `Physician` markup

---

## 15. DATABASE MODELS (KEY COLLECTIONS)

`tenants`, `users`, `roles`, `permissions`, `patients`, `doctors`, `departments`, `appointments`, `encounters`, `prescriptions`, `medications` (master), `lab_tests` (master), `lab_orders`, `lab_results`, `radiology_orders`, `imaging_reports`, `admissions`, `beds`, `wards`, `vitals`, `ot_schedules`, `pharmacy_stock`, `pharmacy_batches`, `purchase_orders`, `vendors`, `invoices`, `invoice_items`, `payments`, `insurance_policies`, `insurance_claims`, `notifications`, `notification_templates`, `messages`, `chat_rooms`, `consents`, `vaccinations`, `vaccine_schedules`, `diet_plans`, `referrals`, `reviews`, `settings`, `feature_flags`.

Provide an **ER diagram** in `docs/ER_DIAGRAM.png` (Mermaid source committed in `docs/ER_DIAGRAM.mmd`).

---

## 16. API DESIGN

- **REST** with `/api/v1/...` versioning
- Consistent response envelope: `{ success, data, error: { code, message, details }, meta: { pagination, ... } }`
- HTTP status codes used correctly (don't 200-everything)
- **OpenAPI 3** spec at `/api/docs` (Swagger UI) — auto-generated from JSDoc/Zod
- **Idempotency keys** on POST `/payments`, `/appointments`
- **Webhooks** outbound for tenant integrations (HMAC-signed)

---

## 17. BACKGROUND JOBS (BullMQ Queues)

- `notifications` — email/SMS/WhatsApp dispatch
- `pdf-generation` — prescriptions, invoices, discharge summaries
- `report-delivery` — auto-send lab reports
- `reminders` — appointment reminders (cron-triggered)
- `inventory-alerts` — daily stock check
- `analytics-rollup` — nightly aggregation for dashboards
- `cleanup` — expired sessions, soft-deleted records past retention

All queues with retry (exp backoff), DLQ, and BullBoard UI mounted at `/admin/queues` (admin-only).

---

## 18. PERFORMANCE

- Mongo indexes defined per collection (composite where appropriate; documented)
- Pagination cursor-based on large collections (messages, notifications)
- Aggregation pipelines used for dashboards; results cached in Redis (TTL 60–300s)
- N+1 prevention: explicit `.populate()` plans or `$lookup` aggregations
- Frontend: route-level code splitting, image lazy-load, virtualized tables (>500 rows)
- Lighthouse target: ≥90 performance, ≥95 a11y on patient-facing pages

---

## 19. DEPLOYMENT & DEVOPS

- `docker-compose.yml` brings up: api, web (nginx serving dist), mongo, redis, mailhog, minio
- `.env.example` lists EVERY env var with description
- `Makefile` with: `make dev`, `make seed`, `make migrate`, `make docker-up`
- **Seed script** creates: 1 tenant, 1 superadmin, 1 hospital admin, 3 doctors (different specialties), 2 nurses, 1 receptionist, 1 pharmacist, 1 lab tech, 20 patients, 50 appointments (past/present/future), 30 prescriptions, 10 invoices, pharmacy stock for 100 drugs, lab test catalog with 50 tests
- **Migration runner** using `migrate-mongo` — versioned schema changes
- README must include: prerequisites, local setup (5 commands max), seeding, deploying to Vercel + Render, environment variable reference, troubleshooting

---

## 20. DOCUMENTATION DELIVERABLES

- `README.md` — quickstart, scripts, env vars
- `docs/ARCHITECTURE.md` — diagrams, request lifecycle, module boundaries
- `docs/API.md` — links to Swagger + auth flow examples (curl + Postman collection)
- `docs/DEPLOYMENT.md` — step-by-step for Vercel + Render + Atlas + Cloudinary
- `docs/SECURITY.md` — threat model + OWASP mapping
- `docs/ER_DIAGRAM.png` + `.mmd` source
- Postman collection: `docs/postman_collection.json`

---

## 21. CODING STANDARDS

- **TypeScript strict mode** everywhere; no `any` without justification comment
- ESLint (typescript-eslint, react, react-hooks, import) + Prettier — both enforced in CI
- **Path aliases** (`@/components`, `@/services`) instead of relative `../../..`
- Husky + lint-staged pre-commit (lint + format on staged files)
- Conventional commits + `CHANGELOG.md` generated by `changesets` or `release-please`
- All public functions JSDoc-commented; complex logic explained with **why**, not **what**
- Reusable, composable components — no 500-line files
- Async/await, no `.then()` chains; centralized error handling

---

## 22. EXTRA / OPTIONAL (behind feature flags)

- AI medical suggestions (OpenAI/Claude API integration for differential diagnosis hints — clearly marked "AI suggestion, not diagnosis")
- AI chatbot assistant for patients (symptom triage, FAQ)
- Multi-language UI (en, hi at minimum)
- Voice-to-text for doctor notes (Web Speech API)
- WhatsApp inbound bot for booking
- Mobile app via React Native (separate workspace)
- Docker Swarm / Kubernetes manifests

---

## 23. OUTPUT FORMAT (HOW THE AGENT SHOULD RESPOND)

The agent must:
1. **First, output a complete file/folder tree** of the entire monorepo
2. **Then, generate each file in full** — no `// ... rest of code` ellipses, no "implement similarly" stubs
3. **Group output by module** (auth → patients → appointments → ... → deployment)
4. **End with**: README, `.env.example`, `docker-compose.yml`, seed script, deployment steps
5. After generation, run through this checklist and confirm each item:
   - [ ] Every route has an auth + RBAC middleware applied
   - [ ] Every Mongoose query is tenant-scoped
   - [ ] Every form has Zod validation on both ends
   - [ ] Every list endpoint supports pagination/sort/filter
   - [ ] Every PDF (prescription, invoice, report) generates and downloads
   - [ ] Socket.IO works (chat + queue + notifications)
   - [ ] Telemedicine room joins successfully
   - [ ] Razorpay payment flow completes (test mode)
   - [ ] Notifications dispatch via at least mailhog + console-stub for WhatsApp
   - [ ] Seed data loads without error and the app is usable end-to-end with seeded credentials

---

## 24. NON-NEGOTIABLES

- **No placeholder code.** If you can't fully implement a feature, mark it explicitly as `[FEATURE FLAG: disabled]` and provide a working stub UI showing "Coming soon".
- **No security shortcuts.** No `eval`, no string-concat SQL/NoSQL, no permissive CORS in production config, no secrets in code.
- **No broken builds.** The output must `pnpm install && pnpm dev` cleanly.
- **No vague UI.** Every screen has real layout, real interactions, real states (loading/empty/error/success).
- **No untyped APIs.** Frontend calls use generated/shared types from `packages/shared`.

---

## 25. FINAL DELIVERABLE

A monorepo that, after `pnpm install && docker-compose up && pnpm seed`, presents:

- A landing page at `http://localhost:5173`
- A login page accepting seeded credentials for every role
- A working dashboard per role with real data
- A bookable appointment flow ending in a telemedicine room
- A doctor flow ending in a signed PDF prescription delivered via email + WhatsApp (mocked locally) + patient portal
- A billing flow ending in a paid invoice (Razorpay test mode)
- A pharmacy dispensing flow with stock deduction
- A lab order → result → patient delivery flow
- An IPD admission → bed assignment → discharge summary flow

If any of the above is missing or broken, the deliverable is incomplete.

---

**End of master prompt.**
