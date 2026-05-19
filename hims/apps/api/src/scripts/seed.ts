/**
 * Comprehensive seed script — creates all demo data needed for end-to-end testing.
 * Run with: pnpm --filter api seed
 */
import mongoose from 'mongoose';
import * as argon2 from 'argon2';
import { connectDatabase } from '../config/database.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { TenantModel } from '../modules/tenants/tenant.model.js';
import { UserModel } from '../modules/users/user.model.js';
import { PatientModel } from '../modules/patients/patient.model.js';
import { DoctorModel } from '../modules/doctors/doctor.model.js';
import { DepartmentModel } from '../modules/departments/department.model.js';
import { AppointmentModel } from '../modules/appointments/appointment.model.js';
import { PrescriptionModel } from '../modules/prescriptions/prescription.model.js';
import { InvoiceModel } from '../modules/billing/billing.model.js';
import { DrugModel, PharmacyBatchModel } from '../modules/pharmacy/pharmacy.model.js';
import { LabTestModel, LabOrderModel } from '../modules/lab/lab.model.js';
import { WardModel, BedModel, AdmissionModel } from '../modules/ipd/ipd.model.js';
import { EncounterModel } from '../modules/encounters/encounter.model.js';
import { generateUHID } from '@hims/shared';

const ARGON2_OPTS = { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4 };

async function hashPwd(pwd: string) {
  return argon2.hash(pwd, ARGON2_OPTS);
}

async function seed() {
  await connectDatabase();
  logger.info('Starting seed...');

  // Clear existing data
  await Promise.all([
    TenantModel.deleteMany({}),
    UserModel.deleteMany({}),
    PatientModel.deleteMany({}),
    DoctorModel.deleteMany({}),
    DepartmentModel.deleteMany({}),
    AppointmentModel.deleteMany({}),
    PrescriptionModel.deleteMany({}),
    InvoiceModel.deleteMany({}),
    DrugModel.deleteMany({}),
    PharmacyBatchModel.deleteMany({}),
    LabTestModel.deleteMany({}),
    LabOrderModel.deleteMany({}),
    WardModel.deleteMany({}),
    BedModel.deleteMany({}),
    AdmissionModel.deleteMany({}),
    EncounterModel.deleteMany({}),
  ]);

  // ── SuperAdmin (platform-level, no tenant) ─────────────────────────────────
  const superAdminTenant = await TenantModel.create({
    name: 'HIMS Platform',
    slug: 'hims-platform',
    phone: '+919999999999',
    email: 'platform@hims.io',
    address: { line1: '1 Platform St', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
    uhidPrefix: 'PLAT',
    uhidSequence: 0,
  });

  await UserModel.create({
    tenantId: superAdminTenant._id,
    firstName: 'Super',
    lastName: 'Admin',
    email: env.PLATFORM_SUPER_ADMIN_EMAIL,
    phone: '+919999999999',
    password: await hashPwd(env.PLATFORM_SUPER_ADMIN_PASSWORD),
    role: 'super_admin',
    isEmailVerified: true,
    isPhoneVerified: true,
  });

  logger.info('SuperAdmin created', { email: env.PLATFORM_SUPER_ADMIN_EMAIL });

  // ── Demo Hospital Tenant ───────────────────────────────────────────────────
  const tenant = await TenantModel.create({
    name: 'City General Hospital',
    slug: 'city-general',
    tagline: 'Caring for life, every day',
    phone: '+912211223344',
    email: 'admin@citygeneral.in',
    address: {
      line1: '42 Healthcare Avenue',
      line2: 'Sector 5',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
    },
    website: 'https://citygeneral.in',
    registrationNumber: 'HOSP-MH-2024-001',
    gstNumber: '27AABCA1234C1Z5',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    uhidPrefix: 'CGH',
    uhidSequence: 0,
    subscriptionPlan: 'enterprise',
    enabledModules: ['opd', 'ipd', 'pharmacy', 'lab', 'billing', 'telemedicine', 'radiology', 'emergency'],
  });

  const tid = tenant._id.toString();
  logger.info('Tenant created', { name: tenant.name });

  // ── Departments ────────────────────────────────────────────────────────────
  const departments = await DepartmentModel.insertMany([
    { tenantId: tid, name: 'General Medicine', code: 'GM', location: 'Block A, Floor 1', phone: '022-1234001' },
    { tenantId: tid, name: 'Cardiology', code: 'CARD', location: 'Block B, Floor 2', phone: '022-1234002' },
    { tenantId: tid, name: 'Orthopedics', code: 'ORTH', location: 'Block C, Floor 1', phone: '022-1234003' },
    { tenantId: tid, name: 'Pediatrics', code: 'PED', location: 'Block A, Floor 2', phone: '022-1234004' },
    { tenantId: tid, name: 'Gynecology', code: 'GYN', location: 'Block D, Floor 1', phone: '022-1234005' },
    { tenantId: tid, name: 'Emergency', code: 'ER', location: 'Block E, Ground', phone: '022-1234999' },
    { tenantId: tid, name: 'Laboratory', code: 'LAB', location: 'Block A, Basement', phone: '022-1234006' },
    { tenantId: tid, name: 'Radiology', code: 'RAD', location: 'Block A, Floor 1', phone: '022-1234007' },
  ]);

  logger.info('Departments created', { count: departments.length });

  // ── Staff Users ─────────────────────────────────────────────────────────────
  const adminPwd = await hashPwd('Admin@123');
  const userPwd = await hashPwd('User@1234');

  const hospitalAdmin = await UserModel.create({
    tenantId: tid,
    firstName: 'Hospital',
    lastName: 'Admin',
    email: 'admin@citygeneral.in',
    phone: '+912211223345',
    password: adminPwd,
    role: 'hospital_admin',
    isEmailVerified: true,
    isPhoneVerified: true,
  });

  const receptionist = await UserModel.create({
    tenantId: tid,
    firstName: 'Priya',
    lastName: 'Sharma',
    email: 'reception@citygeneral.in',
    phone: '+912211223346',
    password: userPwd,
    role: 'receptionist',
    isEmailVerified: true,
    isPhoneVerified: true,
  });

  const pharmacist = await UserModel.create({
    tenantId: tid,
    firstName: 'Ravi',
    lastName: 'Kumar',
    email: 'pharmacy@citygeneral.in',
    phone: '+912211223347',
    password: userPwd,
    role: 'pharmacist',
    isEmailVerified: true,
    isPhoneVerified: true,
  });

  const labTech = await UserModel.create({
    tenantId: tid,
    firstName: 'Sunita',
    lastName: 'Rao',
    email: 'lab@citygeneral.in',
    phone: '+912211223348',
    password: userPwd,
    role: 'lab_technician',
    isEmailVerified: true,
    isPhoneVerified: true,
  });

  const nurseUser = await UserModel.create({
    tenantId: tid,
    firstName: 'Meena',
    lastName: 'Nair',
    email: 'nurse@citygeneral.in',
    phone: '+912211223349',
    password: userPwd,
    role: 'nurse',
    isEmailVerified: true,
    isPhoneVerified: true,
  });

  const accountant = await UserModel.create({
    tenantId: tid,
    firstName: 'Ajay',
    lastName: 'Gupta',
    email: 'accounts@citygeneral.in',
    phone: '+912211223350',
    password: userPwd,
    role: 'accountant',
    isEmailVerified: true,
    isPhoneVerified: true,
  });

  // ── Doctors ────────────────────────────────────────────────────────────────
  const doctorData = [
    { first: 'Anand', last: 'Mehta', spec: 'General Medicine', dept: departments[0]!._id, reg: 'MCI-12345', fee: 500, email: 'dr.mehta@citygeneral.in' },
    { first: 'Suresh', last: 'Kapoor', spec: 'Cardiology', dept: departments[1]!._id, reg: 'MCI-23456', fee: 1200, email: 'dr.kapoor@citygeneral.in' },
    { first: 'Pooja', last: 'Iyer', spec: 'Pediatrics', dept: departments[3]!._id, reg: 'MCI-34567', fee: 700, email: 'dr.iyer@citygeneral.in' },
  ];

  const doctors = [];
  for (const d of doctorData) {
    const userDoc = await UserModel.create({
      tenantId: tid,
      firstName: d.first,
      lastName: d.last,
      email: d.email,
      phone: `+91221122${Math.floor(1000 + Math.random() * 9000)}`,
      password: userPwd,
      role: 'doctor',
      isEmailVerified: true,
      isPhoneVerified: true,
    });

    const schedule = [1, 2, 3, 4, 5].map((day) => ({
      dayOfWeek: day,
      startTime: '09:00',
      endTime: '13:00',
      slotDuration: 15,
      isActive: true,
      departmentId: d.dept,
    }));

    const doc = await DoctorModel.create({
      tenantId: tid,
      userId: userDoc._id,
      firstName: d.first,
      lastName: d.last,
      email: d.email,
      phone: userDoc.phone!,
      specialization: d.spec,
      qualification: ['MBBS', 'MD'],
      registrationNumber: d.reg,
      experience: 10,
      departmentIds: [d.dept],
      consultationFee: d.fee,
      teleConsultationFee: d.fee * 0.8,
      schedule,
    });

    await UserModel.updateOne({ _id: userDoc._id }, { doctorId: doc._id });
    doctors.push(doc);
  }

  logger.info('Doctors created', { count: doctors.length });

  // ── Patients ────────────────────────────────────────────────────────────────
  const patientDefs = [
    { first: 'Rahul', last: 'Verma', dob: '1985-03-15', phone: '+919876543201', email: 'rahul.verma@email.com', gender: 'male' as const, blood: 'O+' },
    { first: 'Priya', last: 'Patel', dob: '1990-07-22', phone: '+919876543202', email: 'priya.patel@email.com', gender: 'female' as const, blood: 'B+' },
    { first: 'Amit', last: 'Singh', dob: '1975-11-08', phone: '+919876543203', email: 'amit.singh@email.com', gender: 'male' as const, blood: 'A+' },
    { first: 'Sona', last: 'Desai', dob: '2000-04-30', phone: '+919876543204', email: 'sona.desai@email.com', gender: 'female' as const, blood: 'AB+' },
    { first: 'Kiran', last: 'Shah', dob: '1965-09-12', phone: '+919876543205', email: 'kiran.shah@email.com', gender: 'male' as const, blood: 'B-' },
    { first: 'Neha', last: 'Joshi', dob: '1992-06-18', phone: '+919876543206', email: 'neha.joshi@email.com', gender: 'female' as const, blood: 'A-' },
    { first: 'Rajesh', last: 'Kumar', dob: '1968-01-25', phone: '+919876543207', email: 'rajesh.kumar@email.com', gender: 'male' as const, blood: 'O-' },
    { first: 'Lakshmi', last: 'Nair', dob: '1978-11-02', phone: '+919876543208', email: 'lakshmi.nair@email.com', gender: 'female' as const, blood: 'A+' },
  ];

  const patients = [];
  let seq = 1;
  for (const p of patientDefs) {
    const uhid = generateUHID('CGH', seq++, 6);
    const patientUser = await UserModel.create({
      tenantId: tid,
      firstName: p.first,
      lastName: p.last,
      email: p.email,
      phone: p.phone,
      password: await hashPwd('Patient@123'),
      role: 'patient',
      isEmailVerified: true,
      isPhoneVerified: true,
    });

    const patient = await PatientModel.create({
      tenantId: tid,
      uhid,
      firstName: p.first,
      lastName: p.last,
      dateOfBirth: new Date(p.dob),
      gender: p.gender,
      phone: p.phone,
      email: p.email,
      bloodGroup: p.blood,
      userId: patientUser._id,
      address: { line1: '123 Patient St', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
      emergencyContacts: [{ name: 'Emergency Contact', relationship: 'Spouse', phone: '+919876543299' }],
    });

    await UserModel.updateOne({ _id: patientUser._id }, { patientId: patient._id });
    patients.push(patient);
  }

  logger.info('Patients created', { count: patients.length });

  // ── Appointments ────────────────────────────────────────────────────────────
  const today = new Date();
  const appts = [];
  for (let i = 0; i < 5; i++) {
    const date = new Date();
    date.setDate(today.getDate() + (i - 2));
    date.setHours(10, 0, 0, 0);
    const patient = patients[i % patients.length]!;
    const doctor = doctors[i % doctors.length]!;
    const appt = await AppointmentModel.create({
      tenantId: tid,
      patientId: patient._id,
      doctorId: doctor._id,
      departmentId: doctor.departmentIds[0],
      appointmentDate: date,
      slotId: `${doctor._id}-${date.toISOString().split('T')[0]}-${i + 1}`,
      slotTime: `${9 + i}:00`,
      slotEndTime: `${10 + i}:00`,
      tokenNumber: i + 1,
      type: i % 3 === 0 ? 'telemedicine' : 'in_person',
      status: i < 2 ? 'completed' : 'scheduled',
      consultationFee: doctor.consultationFee,
      chiefComplaint: ['Fever and cough', 'Chest pain', 'Back pain', 'Headache', 'Regular checkup'][i % 5],
    });
    appts.push(appt);
  }

  logger.info('Appointments created', { count: appts.length });

  // ── Drugs ──────────────────────────────────────────────────────────────────
  const drugDefs = [
    { generic: 'Paracetamol', brand: 'Calpol', form: 'tablet' as const, strength: '500mg', schedule: 'general' as const, gst: 5, price: 2 },
    { generic: 'Amoxicillin', brand: 'Novamox', form: 'capsule' as const, strength: '500mg', schedule: 'H' as const, gst: 12, price: 8 },
    { generic: 'Omeprazole', brand: 'Omez', form: 'capsule' as const, strength: '20mg', schedule: 'H' as const, gst: 12, price: 5 },
    { generic: 'Metformin', brand: 'Glyciphage', form: 'tablet' as const, strength: '500mg', schedule: 'H' as const, gst: 12, price: 3 },
    { generic: 'Atorvastatin', brand: 'Lipitor', form: 'tablet' as const, strength: '10mg', schedule: 'H' as const, gst: 12, price: 15 },
    { generic: 'Amlodipine', brand: 'Amlong', form: 'tablet' as const, strength: '5mg', schedule: 'H' as const, gst: 12, price: 6 },
    { generic: 'Azithromycin', brand: 'Zithromax', form: 'tablet' as const, strength: '500mg', schedule: 'H' as const, gst: 12, price: 25 },
    { generic: 'Cetirizine', brand: 'Alerid', form: 'tablet' as const, strength: '10mg', schedule: 'general' as const, gst: 5, price: 2 },
  ];

  const drugs = await DrugModel.insertMany(
    drugDefs.map((d) => ({ ...d, genericName: d.generic, brandName: d.brand, tenantId: tid, unit: 'mg', minStockLevel: 100 }))
  );

  // Add stock batches
  for (const drug of drugs) {
    await PharmacyBatchModel.create({
      tenantId: tid,
      drugId: drug._id,
      batchNumber: `BATCH-${drug.brandName.toUpperCase()}-001`,
      quantity: 1000,
      soldQuantity: Math.floor(Math.random() * 200),
      unitCostPrice: 1.5,
      unitMrp: 3,
      expiryDate: new Date(Date.now() + 365 * 24 * 3600 * 1000),
      manufacturingDate: new Date(Date.now() - 180 * 24 * 3600 * 1000),
    });
  }

  logger.info('Pharmacy stock created', { drugs: drugs.length });

  // ── Lab Tests ──────────────────────────────────────────────────────────────
  const labTestDefs = [
    { name: 'Complete Blood Count', code: 'CBC', sample: 'Blood (EDTA)', price: 300 },
    { name: 'Blood Glucose (Fasting)', code: 'FBS', sample: 'Blood (Fluoride)', price: 80 },
    { name: 'Blood Glucose (PP)', code: 'PPBS', sample: 'Blood (Fluoride)', price: 80 },
    { name: 'HbA1c', code: 'HBA1C', sample: 'Blood (EDTA)', price: 500 },
    { name: 'Lipid Profile', code: 'LIPID', sample: 'Blood (Serum)', price: 600 },
    { name: 'Liver Function Test', code: 'LFT', sample: 'Blood (Serum)', price: 700 },
    { name: 'Kidney Function Test', code: 'KFT', sample: 'Blood (Serum)', price: 700 },
    { name: 'Thyroid Profile (T3, T4, TSH)', code: 'THYROID', sample: 'Blood (Serum)', price: 900 },
    { name: 'Urine Routine Examination', code: 'URE', sample: 'Urine (Mid-stream)', price: 150 },
    { name: 'ECG', code: 'ECG', sample: 'N/A', price: 200 },
  ];

  await LabTestModel.insertMany(
    labTestDefs.map((t) => ({ ...t, sampleType: t.sample, tenantId: tid, turnaroundHours: 4 }))
  );

  logger.info('Lab tests created', { count: labTestDefs.length });

  // ── Wards & Beds ────────────────────────────────────────────────────────────
  const wardDefs = [
    { name: 'General Ward A', type: 'general' as const, totalBeds: 20, daily: 800, floor: 1 },
    { name: 'Private Ward', type: 'private' as const, totalBeds: 10, daily: 3000, floor: 2 },
    { name: 'ICU', type: 'icu' as const, totalBeds: 8, daily: 8000, floor: 2 },
    { name: 'Semi-Private Ward', type: 'semi_private' as const, totalBeds: 15, daily: 1500, floor: 1 },
  ];

  for (const w of wardDefs) {
    const ward = await WardModel.create({ tenantId: tid, name: w.name, type: w.type, totalBeds: w.totalBeds, dailyCharges: w.daily, floor: w.floor });
    for (let b = 1; b <= w.totalBeds; b++) {
      await BedModel.create({ tenantId: tid, wardId: ward._id, bedNumber: `${w.name.slice(0, 2).toUpperCase()}-${String(b).padStart(3, '0')}` });
    }
  }

  logger.info('Wards and beds created');

  // ── Invoices ────────────────────────────────────────────────────────────────
  const invoice = await InvoiceModel.create({
    tenantId: tid,
    invoiceNumber: 'INV-SEED-001',
    patientId: patients[0]!._id,
    items: [
      { serviceId: 'consult-001', serviceName: 'OPD Consultation', category: 'consultation', quantity: 1, unitPrice: 500, discount: 0, gstRate: 0, subtotal: 500, gstAmount: 0, total: 500 },
      { serviceId: 'lab-cbc', serviceName: 'CBC', category: 'lab', quantity: 1, unitPrice: 300, discount: 0, gstRate: 5, subtotal: 300, gstAmount: 15, total: 315 },
    ],
    subtotal: 800,
    taxAmount: 15,
    totalAmount: 815,
    paidAmount: 815,
    dueAmount: 0,
    status: 'paid',
  });

  logger.info('Sample invoice created', { number: invoice.invoiceNumber });

  // Additional invoices
  await InvoiceModel.insertMany([
    {
      tenantId: tid, invoiceNumber: 'INV-SEED-002', patientId: patients[1]!._id,
      items: [{ serviceId: 'consult-002', serviceName: 'Cardiology Consultation', category: 'consultation', quantity: 1, unitPrice: 1200, discount: 0, gstRate: 0, subtotal: 1200, gstAmount: 0, total: 1200 }],
      subtotal: 1200, taxAmount: 0, totalAmount: 1200, paidAmount: 0, dueAmount: 1200, status: 'issued',
    },
    {
      tenantId: tid, invoiceNumber: 'INV-SEED-003', patientId: patients[2]!._id,
      items: [
        { serviceId: 'consult-003', serviceName: 'OPD Consultation', category: 'consultation', quantity: 1, unitPrice: 500, discount: 0, gstRate: 0, subtotal: 500, gstAmount: 0, total: 500 },
        { serviceId: 'lab-lipid', serviceName: 'Lipid Profile', category: 'lab', quantity: 1, unitPrice: 600, discount: 0, gstRate: 5, subtotal: 600, gstAmount: 30, total: 630 },
      ],
      subtotal: 1100, taxAmount: 30, totalAmount: 1130, paidAmount: 500, dueAmount: 630, status: 'partial',
    },
    {
      tenantId: tid, invoiceNumber: 'INV-SEED-004', patientId: patients[3]!._id,
      items: [{ serviceId: 'consult-004', serviceName: 'Pediatrics Consultation', category: 'consultation', quantity: 1, unitPrice: 700, discount: 0, gstRate: 0, subtotal: 700, gstAmount: 0, total: 700 }],
      subtotal: 700, taxAmount: 0, totalAmount: 700, paidAmount: 700, dueAmount: 0, status: 'paid',
    },
  ]);

  logger.info('Additional invoices created');

  // ── Lab Orders ─────────────────────────────────────────────────────────────
  const labTests = await LabTestModel.find({ tenantId: tid }).limit(5).lean();
  const labOrderStatuses = ['ordered', 'sample_collected', 'result_entered', 'verified', 'ordered'];
  for (let i = 0; i < patients.length && i < labTests.length; i++) {
    const test = labTests[i]!;
    await LabOrderModel.create({
      tenantId: tid,
      orderNumber: `LAB-SEED-00${i + 1}`,
      patientId: patients[i]!._id,
      doctorId: doctors[i % doctors.length]!._id,
      items: [{
        testId: test._id,
        testName: test.name,
        barcodeId: `BAR-SEED-${String(i + 1).padStart(4, '0')}`,
      }],
      status: labOrderStatuses[i] ?? 'ordered',
      priority: i === 0 ? 'urgent' : 'routine',
      createdAt: new Date(Date.now() - i * 3600 * 1000),
    });
  }

  logger.info('Lab orders created', { count: Math.min(patients.length, labTests.length) });

  // ── IPD Admissions ─────────────────────────────────────────────────────────
  const wards = await WardModel.find({ tenantId: tid }).lean();
  const beds = await BedModel.find({ tenantId: tid, status: 'available' }).limit(3).lean();

  const admissionDefs = [
    { patientIdx: 2, reason: 'Chest pain with shortness of breath', diagnosis: 'Acute myocardial infarction', status: 'active', daysAgo: 3 },
    { patientIdx: 4, reason: 'Uncontrolled blood sugar requiring insulin therapy', diagnosis: 'Type 2 Diabetes Mellitus', status: 'active', daysAgo: 1 },
    { patientIdx: 0, reason: 'High fever and productive cough', diagnosis: 'Community-acquired pneumonia', status: 'discharged', daysAgo: 10 },
  ];

  for (let i = 0; i < admissionDefs.length && i < beds.length; i++) {
    const def = admissionDefs[i]!;
    const bed = beds[i]!;
    const ward = wards.find((w) => w._id.toString() === bed.wardId.toString()) ?? wards[0]!;
    const admittedAt = new Date(Date.now() - def.daysAgo * 24 * 3600 * 1000);
    const admission = await AdmissionModel.create({
      tenantId: tid,
      admissionNumber: `IPD-SEED-00${i + 1}`,
      patientId: patients[def.patientIdx]!._id,
      admittingDoctorId: doctors[i % doctors.length]!._id,
      wardId: ward._id,
      bedId: bed._id,
      admittedAt,
      admissionType: i === 1 ? 'emergency' : 'planned',
      admissionReason: def.reason,
      status: def.status,
      diagnosis: def.diagnosis,
      bedHistory: [{ wardId: ward._id, bedId: bed._id, fromDate: admittedAt }],
      dischargedAt: def.status === 'discharged' ? new Date(Date.now() - 2 * 24 * 3600 * 1000) : undefined,
    });

    if (def.status === 'active') {
      await BedModel.findByIdAndUpdate(bed._id, { status: 'occupied', currentAdmissionId: admission._id });
    }
  }

  logger.info('IPD admissions created', { count: admissionDefs.length });

  // ── Encounters (Consultations) ─────────────────────────────────────────────
  const encounterDefs = [
    {
      patientIdx: 0, doctorIdx: 0, deptIdx: 0, type: 'opd' as const,
      complaints: ['Fever for 3 days', 'Body ache'],
      diagnosis: [{ description: 'Viral fever', type: 'primary' as const }],
      impression: 'Acute viral infection, symptomatic treatment advised',
      status: 'completed' as const, isSigned: true, daysAgo: 5,
    },
    {
      patientIdx: 1, doctorIdx: 1, deptIdx: 1, type: 'opd' as const,
      complaints: ['Chest pain on exertion', 'Palpitations'],
      diagnosis: [{ description: 'Hypertensive heart disease', type: 'primary' as const }],
      impression: 'BP elevated, ECG ordered, lifestyle modifications advised',
      status: 'completed' as const, isSigned: true, daysAgo: 3,
    },
    {
      patientIdx: 3, doctorIdx: 2, deptIdx: 3, type: 'opd' as const,
      complaints: ['Cough and cold for 1 week'],
      diagnosis: [{ description: 'Upper respiratory tract infection', type: 'primary' as const }],
      impression: 'URTI, antibiotics prescribed',
      status: 'completed' as const, isSigned: true, daysAgo: 2,
    },
    {
      patientIdx: 4, doctorIdx: 0, deptIdx: 0, type: 'opd' as const,
      complaints: ['High blood sugar reading at home', 'Increased thirst'],
      diagnosis: [{ description: 'Type 2 Diabetes Mellitus - uncontrolled', type: 'primary' as const }],
      impression: 'Glucose monitoring advised, medication adjusted',
      status: 'completed' as const, isSigned: false, daysAgo: 1,
    },
    {
      patientIdx: 5, doctorIdx: 1, deptIdx: 1, type: 'telemedicine' as const,
      complaints: ['Follow-up for hypertension', 'Medication refill needed'],
      diagnosis: [{ description: 'Essential hypertension', type: 'primary' as const }],
      impression: 'BP controlled on current medications, prescription renewed',
      status: 'in_progress' as const, isSigned: false, daysAgo: 0,
    },
  ];

  for (const def of encounterDefs) {
    const encDate = new Date(Date.now() - def.daysAgo * 24 * 3600 * 1000);
    await EncounterModel.create({
      tenantId: tid,
      patientId: patients[def.patientIdx]!._id,
      doctorId: doctors[def.doctorIdx]!._id,
      departmentId: departments[def.deptIdx]!._id,
      encounterType: def.type,
      encounterDate: encDate,
      chiefComplaints: def.complaints,
      diagnosis: def.diagnosis,
      impression: def.impression,
      treatmentPlan: 'As per clinical protocol',
      advice: 'Rest, hydration, follow up in 1 week if no improvement',
      status: def.status,
      isSigned: def.isSigned,
      signedAt: def.isSigned ? encDate : undefined,
    });
  }

  logger.info('Encounters created', { count: encounterDefs.length });

  await mongoose.disconnect();
  logger.info(`\n✅ Seed complete!\n\nDemo credentials:\n` +
    `  SuperAdmin: ${env.PLATFORM_SUPER_ADMIN_EMAIL} / ${env.PLATFORM_SUPER_ADMIN_PASSWORD}\n` +
    `  Hospital Admin: admin@citygeneral.in / Admin@123\n` +
    `  Doctor (GM): dr.mehta@citygeneral.in / User@1234\n` +
    `  Doctor (Cardio): dr.kapoor@citygeneral.in / User@1234\n` +
    `  Receptionist: reception@citygeneral.in / User@1234\n` +
    `  Pharmacist: pharmacy@citygeneral.in / User@1234\n` +
    `  Lab Tech: lab@citygeneral.in / User@1234\n` +
    `  Patient: rahul.verma@email.com / Patient@123\n`
  );
}

seed().catch((err) => {
  logger.error('Seed failed', { error: String(err) });
  process.exit(1);
});
