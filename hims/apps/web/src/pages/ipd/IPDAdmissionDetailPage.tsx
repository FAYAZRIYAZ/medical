import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Activity, FileText, BedDouble } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  wardId: { name: string; type: string } | null;
  bedId: { bedNumber: string } | null;
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

export function IPDAdmissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

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

  const discharge = useMutation({
    mutationFn: (data: { dischargeNotes: string; finalDiagnosis: string }) =>
      api.post(`/ipd/admissions/${id}/discharge`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['ipd'] });
      toast.success('Patient discharged successfully');
    },
    onError: () => toast.error('Discharge failed'),
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

  const patientName = adm?.patientId
    ? `${adm.patientId.firstName} ${adm.patientId.lastName}`
    : 'Unknown Patient';

  const doctorName = adm?.admittingDoctorId
    ? `Dr. ${adm.admittingDoctorId.firstName} ${adm.admittingDoctorId.lastName}`
    : '—';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/ipd" className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{patientName}</h1>
          <p className="text-sm text-muted-foreground">
            {adm?.patientId?.uhid} · {adm?.admissionNumber}
          </p>
        </div>
        {adm?.status === 'active' && (
          <Button
            variant="destructive"
            disabled={discharge.isPending}
            onClick={() => {
              const diag = prompt('Final diagnosis:');
              const notes = prompt('Discharge notes:');
              if (diag && notes) discharge.mutate({ finalDiagnosis: diag, dischargeNotes: notes });
            }}
          >
            Discharge Patient
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Ward / Bed</p>
            <p className="font-semibold">
              {adm?.wardId?.name ?? '—'} · {adm?.bedId?.bedNumber ?? '—'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Admitted</p>
            <p className="font-semibold">
              {adm ? new Date(adm.admittedAt).toLocaleDateString() : '—'}
            </p>
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
          </CardContent>
        </Card>
      </div>

      {/* Patient info */}
      {adm?.patientId && (
        <Card>
          <CardContent className="p-4 flex flex-wrap gap-6">
            <div>
              <p className="text-xs text-muted-foreground">Age / Gender</p>
              <p className="text-sm font-medium">
                {calculateAge(adm.patientId.dateOfBirth)} yr · {adm.patientId.gender}
              </p>
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
                <p className="text-xs text-muted-foreground">Diagnosis</p>
                <p className="text-sm font-medium">{adm.diagnosis}</p>
              </div>
            )}
            {adm.finalDiagnosis && (
              <div>
                <p className="text-xs text-muted-foreground">Final Diagnosis</p>
                <p className="text-sm font-medium">{adm.finalDiagnosis}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="vitals">
        <TabsList>
          <TabsTrigger value="vitals" className="gap-1.5">
            <Activity className="h-3.5 w-3.5" /> Vitals
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Notes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vitals">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Vitals Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {vitals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No vitals recorded yet</p>
                  <p className="text-xs mt-1">Vitals are recorded by nursing staff</p>
                </div>
              ) : (
                <>
                  {/* Latest vitals quick view */}
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
            <CardHeader>
              <CardTitle className="text-base">Clinical Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {adm?.diagnosis || adm?.admissionReason ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Reason for Admission
                    </p>
                    <p className="text-sm">{adm.admissionReason}</p>
                  </div>
                  {adm.diagnosis && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                        Working Diagnosis
                      </p>
                      <p className="text-sm">{adm.diagnosis}</p>
                    </div>
                  )}
                  {adm.finalDiagnosis && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                        Final Diagnosis
                      </p>
                      <p className="text-sm">{adm.finalDiagnosis}</p>
                    </div>
                  )}
                  {adm.dischargedAt && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                        Discharged
                      </p>
                      <p className="text-sm">{new Date(adm.dischargedAt).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BedDouble className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No clinical notes recorded yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
