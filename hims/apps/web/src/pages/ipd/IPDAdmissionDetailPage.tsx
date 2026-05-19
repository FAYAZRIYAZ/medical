import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Activity, FileText, BedDouble, Pencil, UserCheck } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { toast } from 'sonner';
import { calculateAge } from '@/lib/utils';

interface Admission {
  _id: string;
  admissionNumber: string;
  status: 'active' | 'discharged' | 'transferred' | 'expired';
  admittedAt: string;
  dischargedAt?: string;
  admissionReason: string;
  diagnosis?: string;
  finalDiagnosis?: string;
  attendingNotes?: string;
  notes?: string;
  estimatedStay?: number;
  patientId: {
    _id: string;
    firstName: string;
    lastName: string;
    uhid: string;
    dateOfBirth: string;
    gender: string;
    bloodGroup?: string;
    phone?: string;
  };
  admittingDoctorId: {
    firstName: string;
    lastName: string;
    specialization: string;
    registrationNumber: string;
  } | null;
  wardId: { name: string; type: string; floor?: number; dailyCharges?: number } | null;
  bedId: { bedNumber: string; features?: string[] } | null;
}

interface Vitals {
  _id: string;
  recordedAt: string;
  temperature?: number;
  systolicBp?: number;
  diastolicBp?: number;
  pulse?: number;
  spo2?: number;
  respiratoryRate?: number;
  weight?: number;
}

function DischargeDialog({ admId, onClose }: { admId: string; onClose: () => void }) {
  const [dischargeType, setDischargeType] = useState<'recovered' | 'referred' | 'lama' | 'expired' | 'against_advice'>('recovered');
  const [finalDiagnosis, setFinalDiagnosis] = useState('');
  const [treatmentSummary, setTreatmentSummary] = useState('');
  const [dischargeNotes, setDischargeNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const qc = useQueryClient();

  const discharge = useMutation({
    mutationFn: () => api.post(`/ipd/admissions/${admId}/discharge`, {
      dischargeType,
      finalDiagnosis,
      treatmentSummary,
      dischargeNotes: dischargeNotes || undefined,
      followUpDate: followUpDate || undefined,
    }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['ipd'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Patient discharged successfully');
      onClose();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Discharge failed — check all required fields');
    },
  });

  const canSubmit = finalDiagnosis.trim().length > 0 && treatmentSummary.trim().length > 0 && !discharge.isPending;

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Discharge Patient</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 mt-2">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Discharge Type *</label>
          <select
            value={dischargeType}
            onChange={(e) => setDischargeType(e.target.value as typeof dischargeType)}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="recovered">Recovered</option>
            <option value="referred">Referred to another facility</option>
            <option value="lama">LAMA (Left Against Medical Advice)</option>
            <option value="expired">Expired</option>
            <option value="against_advice">Against Advice</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Final Diagnosis *</label>
          <Input value={finalDiagnosis} onChange={(e) => setFinalDiagnosis(e.target.value)} placeholder="Enter final diagnosis..." />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Treatment Summary *</label>
          <Textarea value={treatmentSummary} onChange={(e) => setTreatmentSummary(e.target.value)} rows={4} placeholder="Summary of treatment provided during this admission..." />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Discharge Instructions</label>
          <Textarea value={dischargeNotes} onChange={(e) => setDischargeNotes(e.target.value)} rows={2} placeholder="Post-discharge instructions, medication changes..." />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Follow-up Date</label>
          <Input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
        </div>
        <div className="flex justify-end gap-3 pt-1">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" disabled={!canSubmit} onClick={() => discharge.mutate()}>
            {discharge.isPending ? 'Processing…' : 'Confirm Discharge'}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

function EditAdmissionDialog({ adm, onClose }: { adm: Admission; onClose: () => void }) {
  const [diagnosis, setDiagnosis] = useState(adm.diagnosis ?? '');
  const [attendingNotes, setAttendingNotes] = useState(adm.attendingNotes ?? '');
  const [admissionReason, setAdmissionReason] = useState(adm.admissionReason ?? '');
  const [estimatedStay, setEstimatedStay] = useState(String(adm.estimatedStay ?? ''));
  const qc = useQueryClient();

  const update = useMutation({
    mutationFn: () => api.patch(`/ipd/admissions/${adm._id}`, {
      diagnosis: diagnosis || undefined,
      attendingNotes: attendingNotes || undefined,
      admissionReason,
      estimatedStay: estimatedStay ? Number(estimatedStay) : undefined,
    }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['ipd', 'admission', adm._id] });
      toast.success('Admission updated');
      onClose();
    },
    onError: () => toast.error('Update failed'),
  });

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Edit Admission Details</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 mt-2">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Admission Reason</label>
          <Textarea value={admissionReason} onChange={(e) => setAdmissionReason(e.target.value)} rows={2} />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Working Diagnosis</label>
          <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="Current working diagnosis..." />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Clinical Notes</label>
          <Textarea value={attendingNotes} onChange={(e) => setAttendingNotes(e.target.value)} rows={3} placeholder="Progress notes, observations..." />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Estimated Stay (days)</label>
          <Input type="number" min="1" value={estimatedStay} onChange={(e) => setEstimatedStay(e.target.value)} />
        </div>
        <div className="flex justify-end gap-3 pt-1">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={update.isPending} onClick={() => update.mutate()} className="bg-medical-blue hover:bg-medical-blue/90">
            {update.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

export function IPDAdmissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [dischargeOpen, setDischargeOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const { data: admissionRaw, isLoading } = useQuery({
    queryKey: ['ipd', 'admission', id],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Admission }>(`/ipd/admissions/${id}`);
      return res.data.data;
    },
  });

  const { data: vitalsRaw } = useQuery({
    queryKey: ['ipd', 'vitals', id],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Vitals[] }>('/ipd/vitals', {
        params: { admissionId: id, limit: 20 },
      });
      return res.data.data;
    },
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const adm = admissionRaw;
  const vitals = vitalsRaw ?? [];

  const vitalsChartData = vitals.map((v) => ({
    time: new Date(v.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    bp: v.systolicBp,
    pulse: v.pulse,
    temp: v.temperature,
    spo2: v.spo2,
  }));

  const patientName = adm?.patientId ? `${adm.patientId.firstName} ${adm.patientId.lastName}` : 'Unknown Patient';
  const doctorName = adm?.admittingDoctorId ? `Dr. ${adm.admittingDoctorId.firstName} ${adm.admittingDoctorId.lastName}` : '—';

  const daysAdmitted = adm?.admittedAt
    ? Math.ceil((Date.now() - new Date(adm.admittedAt).getTime()) / 86400000)
    : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/ipd" className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{patientName}</h1>
          <p className="text-sm text-muted-foreground">{adm?.patientId?.uhid} · {adm?.admissionNumber}</p>
        </div>
        {adm?.status === 'active' && (
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" /> Edit Details
            </Button>
            <Button variant="destructive" className="gap-2" onClick={() => setDischargeOpen(true)}>
              <UserCheck className="h-4 w-4" /> Discharge
            </Button>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Ward / Bed</p>
            <p className="font-semibold">{adm?.wardId?.name ?? '—'} · {adm?.bedId?.bedNumber ?? '—'}</p>
            {adm?.wardId?.type && <p className="text-xs text-muted-foreground capitalize">{adm.wardId.type}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Admitted</p>
            <p className="font-semibold">{adm ? new Date(adm.admittedAt).toLocaleDateString() : '—'}</p>
            {adm?.status === 'active' && <p className="text-xs text-muted-foreground">Day {daysAdmitted}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Attending Doctor</p>
            <p className="font-semibold truncate">{doctorName}</p>
            {adm?.admittingDoctorId?.specialization && (
              <p className="text-xs text-muted-foreground">{adm.admittingDoctorId.specialization}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Status</p>
            <Badge variant={adm?.status === 'active' ? 'default' : 'secondary'} className="mt-1">
              {adm?.status ?? '—'}
            </Badge>
            {adm?.wardId?.dailyCharges && (
              <p className="text-xs text-muted-foreground mt-1">₹{adm.wardId.dailyCharges}/day</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Patient info */}
      {adm?.patientId && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-medium uppercase tracking-wide">Patient Information</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 flex flex-wrap gap-6">
            <div>
              <p className="text-xs text-muted-foreground">Age / Gender</p>
              <p className="text-sm font-medium">{calculateAge(adm.patientId.dateOfBirth)} yr · {adm.patientId.gender}</p>
            </div>
            {adm.patientId.bloodGroup && (
              <div>
                <p className="text-xs text-muted-foreground">Blood Group</p>
                <p className="text-sm font-medium">{adm.patientId.bloodGroup}</p>
              </div>
            )}
            {adm.patientId.phone && (
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="text-sm font-medium">{adm.patientId.phone}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Admission Reason</p>
              <p className="text-sm font-medium">{adm.admissionReason}</p>
            </div>
            {adm.diagnosis && (
              <div>
                <p className="text-xs text-muted-foreground">Working Diagnosis</p>
                <p className="text-sm font-medium">{adm.diagnosis}</p>
              </div>
            )}
            {adm.estimatedStay && (
              <div>
                <p className="text-xs text-muted-foreground">Estimated Stay</p>
                <p className="text-sm font-medium">{adm.estimatedStay} days</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="vitals">
        <TabsList>
          <TabsTrigger value="vitals" className="gap-1.5"><Activity className="h-3.5 w-3.5" />Vitals</TabsTrigger>
          <TabsTrigger value="notes" className="gap-1.5"><FileText className="h-3.5 w-3.5" />Clinical Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="vitals">
          <Card>
            <CardHeader><CardTitle className="text-base">Vitals Trend</CardTitle></CardHeader>
            <CardContent>
              {vitals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No vitals recorded yet</p>
                  <p className="text-xs mt-1">Vitals are recorded by nursing staff</p>
                </div>
              ) : (
                <>
                  {vitals[0] && (
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-6">
                      {[
                        { label: 'BP', value: vitals[0].systolicBp && vitals[0].diastolicBp ? `${vitals[0].systolicBp}/${vitals[0].diastolicBp}` : '—', unit: 'mmHg' },
                        { label: 'Pulse', value: vitals[0].pulse ?? '—', unit: 'bpm' },
                        { label: 'Temp', value: vitals[0].temperature ?? '—', unit: '°C' },
                        { label: 'SpO₂', value: vitals[0].spo2 ?? '—', unit: '%' },
                        { label: 'RR', value: vitals[0].respiratoryRate ?? '—', unit: '/min' },
                      ].map((v) => (
                        <div key={v.label} className="bg-muted/50 rounded-lg p-3 text-center">
                          <p className="text-xs text-muted-foreground">{v.label}</p>
                          <p className="text-lg font-bold text-medical-blue">{String(v.value)}</p>
                          <p className="text-xs text-muted-foreground">{v.unit}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={vitalsChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="bp" stroke="#1d4ed8" name="BP (sys)" dot={false} strokeWidth={2} />
                      <Line type="monotone" dataKey="pulse" stroke="#0d9488" name="Pulse" dot={false} strokeWidth={2} />
                      <Line type="monotone" dataKey="spo2" stroke="#f59e0b" name="SpO₂" dot={false} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Clinical Notes</CardTitle>
              {adm?.status === 'active' && (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-3.5 w-3.5" /> Edit Notes
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Reason for Admission</p>
                  <p className="text-sm">{adm?.admissionReason || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Working Diagnosis</p>
                  <p className="text-sm">{adm?.diagnosis || <span className="text-muted-foreground italic">Not set</span>}</p>
                </div>
                {adm?.attendingNotes && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Clinical Notes</p>
                    <p className="text-sm whitespace-pre-wrap">{adm.attendingNotes}</p>
                  </div>
                )}
                {adm?.finalDiagnosis && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Final Diagnosis</p>
                    <p className="text-sm font-medium text-gray-900">{adm.finalDiagnosis}</p>
                  </div>
                )}
                {adm?.dischargedAt && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Discharged At</p>
                    <p className="text-sm">{new Date(adm.dischargedAt).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Discharge Dialog */}
      <Dialog open={dischargeOpen} onOpenChange={setDischargeOpen}>
        <DischargeDialog admId={id!} onClose={() => setDischargeOpen(false)} />
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        {adm && <EditAdmissionDialog adm={adm} onClose={() => setEditOpen(false)} />}
      </Dialog>
    </div>
  );
}
