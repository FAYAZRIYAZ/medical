import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import { AdmitPatientSchema, type AdmitPatientInput } from '@hims/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDebounce } from '@/hooks/useDebounce';

interface Ward   { _id: string; name: string; type: string; totalBeds?: number; }
interface Bed    { _id: string; bedNumber: string; }
interface Doctor { _id: string; firstName: string; lastName: string; specialization: string; }
interface Patient { _id: string; firstName: string; lastName: string; uhid: string; phone: string; }

export function NewIPDAdmissionPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const [selectedWard, setSelectedWard] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const debouncedSearch = useDebounce(patientSearch, 300);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<AdmitPatientInput>({
    resolver: zodResolver(AdmitPatientSchema),
    defaultValues: {
      patientId: params.get('patientId') ?? '',
      admissionType: 'planned',
      mlcCase: false,
      emergencyContactNotified: false,
    },
  });

  // Pre-fill patient if passed via URL
  const prefilledId = params.get('patientId');
  useQuery({
    queryKey: ['patients', 'detail', prefilledId],
    queryFn: async () => {
      const res = await api.get<{ data: Patient }>(`/patients/${prefilledId}`);
      const p = res.data.data;
      setSelectedPatient(p);
      setValue('patientId', p._id);
      return p;
    },
    enabled: !!prefilledId && !selectedPatient,
  });

  const { data: patientResults } = useQuery({
    queryKey: ['patients', 'search', debouncedSearch],
    queryFn: async () => {
      const res = await api.get<{ data: Patient[] }>('/patients', { params: { q: debouncedSearch, limit: 8 } });
      return res.data.data;
    },
    enabled: debouncedSearch.length >= 1 && !selectedPatient,
  });

  const { data: wards } = useQuery({
    queryKey: ['ipd', 'wards'],
    queryFn: async () => {
      const res = await api.get<{ data: Ward[] }>('/ipd/wards');
      return res.data.data ?? [];
    },
  });

  const { data: beds } = useQuery({
    queryKey: ['ipd', 'beds', selectedWard],
    queryFn: async () => {
      const res = await api.get<{ data: Bed[] }>('/ipd/beds', { params: { wardId: selectedWard, status: 'available' } });
      return res.data.data ?? [];
    },
    enabled: !!selectedWard,
  });

  const { data: doctors } = useQuery({
    queryKey: ['doctors', 'list'],
    queryFn: async () => {
      const res = await api.get<{ data: Doctor[] }>('/doctors');
      return res.data.data ?? [];
    },
  });

  const admit = useMutation({
    mutationFn: (data: AdmitPatientInput) => api.post('/ipd/admissions', data),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      void qc.invalidateQueries({ queryKey: ['ipd'] });
      toast.success('Patient admitted successfully');
      const id = (res.data as { data: { _id: string } }).data._id;
      navigate(`/ipd/${id}`);
    },
    onError: () => toast.error('Admission failed — check bed availability and all required fields.'),
  });

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admit Patient</h1>
          <p className="text-sm text-muted-foreground">Create a new IPD admission</p>
        </div>
      </div>

      <form onSubmit={handleSubmit((d) => admit.mutate(d))} className="space-y-5">
        {/* Patient & Doctor */}
        <Card>
          <CardHeader><CardTitle className="text-base">Patient & Doctor</CardTitle></CardHeader>
          <CardContent className="space-y-4">

            {/* Patient Search */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Patient *</label>
              {selectedPatient ? (
                <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                  <div>
                    <p className="text-sm font-medium">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                    <p className="text-xs text-muted-foreground">{selectedPatient.uhid} · {selectedPatient.phone}</p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => {
                    setSelectedPatient(null);
                    setValue('patientId', '');
                    setPatientSearch('');
                  }}>Change</Button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Search patient by name, UHID or phone..."
                    value={patientSearch}
                    onChange={(e) => { setPatientSearch(e.target.value); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                  />
                  {showDropdown && debouncedSearch.length >= 1 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg overflow-hidden">
                      {(patientResults ?? []).length === 0 ? (
                        <p className="px-4 py-3 text-sm text-muted-foreground">No patients found — try name, UHID or phone</p>
                      ) : (patientResults ?? []).map((p) => (
                        <button key={p._id} type="button"
                          className="w-full text-left px-4 py-2.5 hover:bg-muted/50 border-b last:border-b-0 transition-colors"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setSelectedPatient(p);
                            setValue('patientId', p._id, { shouldValidate: true });
                            setShowDropdown(false);
                          }}>
                          <p className="text-sm font-medium">{p.firstName} {p.lastName}</p>
                          <p className="text-xs text-muted-foreground">{p.uhid} · {p.phone}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {errors.patientId && <p className="mt-1 text-xs text-red-600">Please search and select a patient from the dropdown</p>}
            </div>

            {/* Doctor */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Admitting Doctor *</label>
              <Select onValueChange={(v) => setValue('admittingDoctorId', v)}>
                <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                <SelectContent>
                  {(doctors ?? []).map((d) => (
                    <SelectItem key={d._id} value={d._id}>
                      Dr. {d.firstName} {d.lastName} — {d.specialization}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.admittingDoctorId && <p className="mt-1 text-xs text-red-600">{errors.admittingDoctorId.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Ward & Bed */}
        <Card>
          <CardHeader><CardTitle className="text-base">Ward & Bed</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Ward *</label>
              <Select onValueChange={(v) => { setSelectedWard(v); setValue('wardId', v); setValue('bedId', ''); }}>
                <SelectTrigger><SelectValue placeholder="Select ward" /></SelectTrigger>
                <SelectContent>
                  {(wards ?? []).map((w) => (
                    <SelectItem key={w._id} value={w._id}>
                      {w.name} <span className="text-muted-foreground">({w.type})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.wardId && <p className="mt-1 text-xs text-red-600">{errors.wardId.message}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Available Bed *
                {selectedWard && beds !== undefined && (
                  <span className="text-muted-foreground font-normal ml-2">({beds.length} available)</span>
                )}
              </label>
              <Select onValueChange={(v) => setValue('bedId', v)} disabled={!selectedWard}>
                <SelectTrigger>
                  <SelectValue placeholder={selectedWard ? (beds?.length === 0 ? 'No beds available' : 'Select bed') : 'Select ward first'} />
                </SelectTrigger>
                <SelectContent>
                  {(beds ?? []).map((b) => (
                    <SelectItem key={b._id} value={b._id}>Bed {b.bedNumber}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.bedId && <p className="mt-1 text-xs text-red-600">{errors.bedId.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Admission Details */}
        <Card>
          <CardHeader><CardTitle className="text-base">Admission Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Admission Type *</label>
              <Select defaultValue="planned" onValueChange={(v) => setValue('admissionType', v as AdmitPatientInput['admissionType'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Admission Reason *</label>
              <Textarea {...register('admissionReason')} placeholder="Reason for admission..." rows={3} />
              {errors.admissionReason && <p className="mt-1 text-xs text-red-600">{errors.admissionReason.message}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Preliminary Diagnosis</label>
              <Input {...register('diagnosis')} placeholder="Working diagnosis" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Referred By</label>
                <Input {...register('referredBy')} placeholder="Referring doctor / hospital" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Estimated Stay (days)</label>
                <Input type="number" min={1} {...register('estimatedStay', { valueAsNumber: true })} placeholder="e.g. 3" />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Notes</label>
              <Textarea {...register('notes')} placeholder="Additional notes..." rows={2} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" disabled={admit.isPending} className="bg-medical-blue hover:bg-medical-blue/90 min-w-[130px]">
            {admit.isPending ? 'Admitting…' : 'Admit Patient'}
          </Button>
        </div>
      </form>
    </div>
  );
}
