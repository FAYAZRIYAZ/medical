import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { PrescriptionModel } from '../modules/prescriptions/prescription.model.js';
import { AdmissionModel } from '../modules/ipd/ipd.model.js';
import { LabResultModel, LabOrderModel } from '../modules/lab/lab.model.js';
import { storageService } from '../integrations/storage.js';
import { logger } from '../config/logger.js';

export async function generatePrescriptionPdf(data: { prescriptionId?: string; admissionId?: string; resultId?: string }): Promise<void> {
  if (data.prescriptionId) {
    await _generateRxPdf(data.prescriptionId);
  } else if (data.admissionId) {
    await _generateDischargeSummaryPdf(data.admissionId);
  } else if (data.resultId) {
    await _generateLabReportPdf(data.resultId);
  }
}

async function _generateRxPdf(prescriptionId: string): Promise<void> {
  const rx = await PrescriptionModel.findById(prescriptionId)
    .populate('patientId', 'firstName lastName uhid dateOfBirth gender phone')
    .populate('doctorId', 'firstName lastName specialization registrationNumber signatureImage')
    .lean();

  if (!rx) { logger.warn('Prescription not found for PDF', { prescriptionId }); return; }

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const buffers: Buffer[] = [];

  doc.on('data', (chunk: Buffer) => buffers.push(chunk));

  await new Promise<void>((resolve) => {
    doc.on('end', () => resolve());

    // Header
    doc.fontSize(20).text('PRESCRIPTION', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Rx No: ${rx.prescriptionNumber}  |  Date: ${new Date(rx.createdAt).toLocaleDateString('en-IN')}`, { align: 'right' });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    // Doctor info
    const doctor = rx.doctorId as unknown as Record<string, unknown>;
    const patient = rx.patientId as unknown as Record<string, unknown>;
    doc.fontSize(12).text(`Dr. ${String(doctor.firstName ?? '')} ${String(doctor.lastName ?? '')}`, { continued: false });
    doc.fontSize(10).text(`${String(doctor.specialization ?? '')}  |  Reg No: ${String(doctor.registrationNumber ?? '')}`);
    doc.moveDown(0.5);

    // Patient info
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);
    doc.text(`Patient: ${String(patient.firstName ?? '')} ${String(patient.lastName ?? '')}  |  UHID: ${String(patient.uhid ?? '')}  |  Phone: ${String(patient.phone ?? '')}`);
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    // Diagnosis
    if (rx.diagnosis?.length) {
      doc.fontSize(11).text('Diagnosis:', { underline: true });
      doc.fontSize(10).text(rx.diagnosis.join(', '));
      doc.moveDown(0.5);
    }

    // Medications
    doc.fontSize(11).text('Medications:', { underline: true });
    doc.moveDown(0.3);
    rx.items.forEach((item, i) => {
      doc.fontSize(10).text(`${i + 1}. ${item.drugName} ${item.dose} — ${item.frequency} × ${item.duration} (${item.route})`);
      if (item.instructions) doc.text(`   Instructions: ${item.instructions}`, { indent: 20 });
    });
    doc.moveDown(1);

    // Advice
    if (rx.advice) {
      doc.fontSize(11).text('Advice:', { underline: true });
      doc.fontSize(10).text(rx.advice);
      doc.moveDown(0.5);
    }

    // Follow-up
    if (rx.followUpDate) {
      doc.text(`Follow-up: ${new Date(rx.followUpDate).toLocaleDateString('en-IN')}`);
      if (rx.followUpInstructions) doc.text(rx.followUpInstructions);
    }

    doc.end();
  });

  const pdfBuffer = Buffer.concat(buffers);
  const path = `prescriptions/${prescriptionId}/prescription.pdf`;
  const url = await storageService.upload(pdfBuffer, path, 'application/pdf');

  await PrescriptionModel.findByIdAndUpdate(prescriptionId, { pdfUrl: url });
  logger.info('Prescription PDF generated', { prescriptionId, url });
}

async function _generateDischargeSummaryPdf(admissionId: string): Promise<void> {
  const admission = await AdmissionModel.findById(admissionId)
    .populate('patientId', 'firstName lastName uhid dateOfBirth gender phone')
    .populate('admittingDoctorId', 'firstName lastName specialization')
    .lean();
  if (!admission) return;

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const buffers: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => buffers.push(chunk));

  await new Promise<void>((resolve) => {
    doc.on('end', () => resolve());

    doc.fontSize(18).text('DISCHARGE SUMMARY', { align: 'center' });
    doc.moveDown(0.5);

    const patient = admission.patientId as unknown as Record<string, unknown>;
    const doctor = admission.admittingDoctorId as unknown as Record<string, unknown>;

    doc.fontSize(11).text(`Patient: ${String(patient.firstName ?? '')} ${String(patient.lastName ?? '')} | UHID: ${String(patient.uhid ?? '')}`);
    doc.text(`Admitting Doctor: Dr. ${String(doctor.firstName ?? '')} ${String(doctor.lastName ?? '')}`);
    doc.text(`Admitted: ${new Date(admission.admittedAt).toLocaleDateString('en-IN')}  Discharged: ${admission.dischargedAt ? new Date(admission.dischargedAt).toLocaleDateString('en-IN') : 'N/A'}`);
    doc.text(`Admission No: ${admission.admissionNumber}`);
    doc.moveDown(1);

    doc.fontSize(12).text('Final Diagnosis:', { underline: true });
    doc.fontSize(10).text(admission.finalDiagnosis ?? 'N/A');
    doc.moveDown(0.5);

    doc.fontSize(12).text('Treatment Summary:', { underline: true });
    doc.fontSize(10).text(admission.treatmentSummary ?? 'N/A');
    doc.moveDown(0.5);

    if (admission.medications) {
      doc.fontSize(12).text('Medications on Discharge:', { underline: true });
      doc.fontSize(10).text(admission.medications);
      doc.moveDown(0.5);
    }

    if (admission.followUpDate) {
      doc.fontSize(12).text('Follow-up:', { underline: true });
      doc.fontSize(10).text(`Date: ${new Date(admission.followUpDate).toLocaleDateString('en-IN')}`);
      if (admission.followUpInstructions) doc.text(admission.followUpInstructions);
    }

    doc.end();
  });

  const pdfBuffer = Buffer.concat(buffers);
  const path = `admissions/${admissionId}/discharge-summary.pdf`;
  const url = await storageService.upload(pdfBuffer, path, 'application/pdf');
  await AdmissionModel.findByIdAndUpdate(admissionId, { dischargePdfUrl: url });
}

async function _generateLabReportPdf(resultId: string): Promise<void> {
  const result = await LabResultModel.findById(resultId)
    .populate('patientId', 'firstName lastName uhid dateOfBirth gender')
    .populate('testId', 'name code')
    .lean();
  if (!result) return;

  const order = await LabOrderModel.findById(result.orderId).lean();
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const buffers: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => buffers.push(chunk));

  await new Promise<void>((resolve) => {
    doc.on('end', () => resolve());

    doc.fontSize(18).text('LAB REPORT', { align: 'center' });
    doc.moveDown(0.5);

    const patient = result.patientId as unknown as Record<string, unknown>;
    const test = result.testId as unknown as Record<string, unknown>;

    doc.fontSize(10).text(`Patient: ${String(patient.firstName ?? '')} ${String(patient.lastName ?? '')} | UHID: ${String(patient.uhid ?? '')}`);
    doc.text(`Test: ${String(test.name ?? '')} (${String(test.code ?? '')})`);
    doc.text(`Order No: ${order?.orderNumber ?? ''}  |  Reported: ${new Date(result.createdAt).toLocaleDateString('en-IN')}`);
    if (result.isVerified) doc.text(`Verified by Lab Pathologist`);
    doc.moveDown(1);

    doc.fontSize(11).text('Results:', { underline: true });
    doc.moveDown(0.3);

    // Table header
    const cols = [50, 200, 320, 400, 480];
    doc.fontSize(10).font('Helvetica-Bold')
      .text('Parameter', cols[0], doc.y, { continued: false })
      .text('Value', cols[1]!, doc.y - 12)
      .text('Unit', cols[2]!, doc.y - 12)
      .text('Reference Range', cols[3]!, doc.y - 12);
    doc.font('Helvetica');
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.3);

    result.results.forEach((r) => {
      const color = r.critical ? 'red' : r.abnormal ? 'orange' : 'black';
      const y = doc.y;
      doc.fillColor(color).fontSize(9)
        .text(r.parameter, cols[0], y)
        .text(String(r.value), cols[1]!, y)
        .text(r.unit ?? '', cols[2]!, y)
        .text(r.referenceRange ?? '', cols[3]!, y)
        .fillColor('black');
      doc.moveDown(0.3);
    });

    doc.end();
  });

  const pdfBuffer = Buffer.concat(buffers);
  const path = `lab-results/${resultId}/report.pdf`;
  const url = await storageService.upload(pdfBuffer, path, 'application/pdf');
  await LabOrderModel.findByIdAndUpdate(result.orderId, { reportPdfUrl: url, reportDeliveredAt: new Date() });
}
