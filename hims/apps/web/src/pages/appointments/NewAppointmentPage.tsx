import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import { CreateAppointmentSchema, type CreateAppointmentInput } from '@hims/shared';
import { useCreateAppointment, useDoctorSlots, type DoctorSlot } from '@/hooks/useAppointments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';

interface Doctor {
  _id: string;
  firstName: string;
  lastName: string;
  specialization: string;
  departmentIds?: ({ _id: string; name: string } | string)[];
}

interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  uhid: string;
  phone: string;
}

function getDeptId(dept: { _id: string; name: string } | string) {
  return typeof dept === 'string' ? dept : dept._id;
}

export function NewAppointmentPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const prefilledPatientId = params.get('patientId') ?? '';

  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const debouncedSearch = useDebounce(patientSearch, 300);

  const { mutate, isPending } = useCreateAppointment();

  const { data: doctors } = useQuery({
    queryKey: ['doctors', 'list'],
    queryFn: async () => {
      const res = await api.get<{ data: Doctor[] }>('/doctors');
      return res.data.data;
    },
  });

  const { data: patientResults } = useQuery({
    queryKey: ['patients', 'search', debouncedSearch],
    queryFn: async () => {
      const res = await api.get<{ data: Patient[] }>('/patients', { params: { q: debouncedSearch, limit: 8 } });
      return res.data.data;
    },
    enabled: debouncedSearch.length >= 1 && !selectedPatient,
  });

  // Pre-load patient if patientId is in URL
  const { data: prefilledPatient } = useQuery({
    queryKey: ['patients', 'detail', prefilledPatientId],
    queryFn: async () => {
      const res = await api.get<{ data: Patient }>(`/patients/${prefilledPatientId}`);
      return res.data.data;
    },
    enabled: Boolean(prefilledPatientId),
  });

  const { data: slots = [] } = useDoctorSlots(selectedDoctor, selectedDate);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<CreateAppointmentInput>({
    resolver: zodResolver(CreateAppointmentSchema),
    defaultValues: { type: 'in_person' },
  });

  useEffect(() => {
    if (prefilledPatient && !selectedPatient) {
      setSelectedPatient(prefilledPatient as Patient);
      setValue('patientId', prefilledPatient._id);
    }
  }, [prefilledPatient, selectedPatient, setValue]);

  const selectedDoctorData = (doctors ?? []).find((d) => d._id === selectedDoctor);
  const hasDepartment = Boolean(selectedDoctorData?.departmentIds?.[0]);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Book Appointment</h1>
          <p className="text-sm text-muted-foreground">Schedule a new appointment</p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit((data) => mutate(data, { onSuccess: () => navigate('/appointments') }))}
        className="space-y-6"
      >
        <Card>
          <CardHeader><CardTitle className="text-base">Appointment Details</CardTitle></CardHeader>
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
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setSelectedPatient(null); setValue('patientId', ''); setPatientSearch(''); }}>
                    Change
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Search by name, UHID, or phone..."
                    value={patientSearch}
                    onChange={(e) => { setPatientSearch(e.target.value); setShowPatientDropdown(true); }}
                    onFocus={() => setShowPatientDropdown(true)}
                    onBlur={() => setTimeout(() => setShowPatientDropdown(false), 200)}
                  />
                  {showPatientDropdown && debouncedSearch.length >= 1 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg overflow-hidden">
                      {(patientResults ?? []).length === 0 ? (
                        <p className="px-4 py-3 text-sm text-muted-foreground">No patients found — try name, UHID or phone</p>
                      ) : (patientResults ?? []).map((p) => (
                        <button
                          key={p._id}
                          type="button"
                          className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors border-b last:border-b-0"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => { setSelectedPatient(p); setValue('patientId', p._id, { shouldValidate: true }); setShowPatientDropdown(false); }}
                        >
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
              <label className="mb-1.5 block text-sm font-medium">Doctor *</label>
              <Select onValueChange={(v) => {
                setValue('doctorId', v);
                setSelectedDoctor(v);
                const doc = (doctors ?? []).find((d) => d._id === v);
                if (doc?.departmentIds?.[0]) setValue('departmentId', getDeptId(doc.departmentIds[0]));
              }}>
                <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                <SelectContent>
                  {(doctors ?? []).map((d) => (
                    <SelectItem key={d._id} value={d._id}>
                      Dr. {d.firstName} {d.lastName} — {d.specialization}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.doctorId && <p className="mt-1 text-xs text-red-600">{errors.doctorId.message}</p>}
            </div>

            {/* Department auto-fill badge */}
            {hasDepartment && selectedDoctorData?.departmentIds?.[0] && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                  Dept: {typeof selectedDoctorData.departmentIds[0] === 'string'
                    ? selectedDoctorData.departmentIds[0]
                    : (selectedDoctorData.departmentIds[0] as { name: string }).name}
                </span>
              </div>
            )}

            {!hasDepartment && (
              <div>
                <label className="mb-1.5 block text-sm font-medium">Department ID *</label>
                <Input {...register('departmentId')} placeholder="Enter Department ID" />
                {errors.departmentId && <p className="mt-1 text-xs text-red-600">{errors.departmentId.message}</p>}
              </div>
            )}

            {/* Date */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Date *</label>
              <Input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setValue('appointmentDate', e.target.value);
                  setSelectedSlot('');
                }}
              />
              {errors.appointmentDate && <p className="mt-1 text-xs text-red-600">{errors.appointmentDate.message}</p>}
            </div>

            {/* Time Slots */}
            {selectedDoctor && selectedDate && (
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Time Slot * {slots.length === 0 && <span className="text-muted-foreground font-normal">(No slots — doctor may not be scheduled on this day)</span>}
                </label>
                {slots.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {(slots as DoctorSlot[]).map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        disabled={slot.isBooked}
                        className={cn(
                          'p-2 text-xs rounded-lg border transition-colors',
                          selectedSlot === slot.id ? 'bg-medical-blue text-white border-medical-blue' :
                          slot.isBooked ? 'bg-gray-100 text-gray-400 cursor-not-allowed line-through' :
                          'hover:border-medical-blue hover:bg-blue-50'
                        )}
                        onClick={() => { setValue('slotId', slot.id); setSelectedSlot(slot.id); }}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                )}
                {errors.slotId && <p className="mt-1 text-xs text-red-600">{errors.slotId.message}</p>}
              </div>
            )}

            {/* Type */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Appointment Type *</label>
              <Select defaultValue="in_person" onValueChange={(v) => setValue('type', v as CreateAppointmentInput['type'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_person">In-Person</SelectItem>
                  <SelectItem value="telemedicine">Telemedicine</SelectItem>
                  <SelectItem value="walk_in">Walk-in</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Chief Complaint */}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Chief Complaint</label>
              <Textarea {...register('chiefComplaint')} placeholder="Describe the reason for visit..." rows={3} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" disabled={isPending} className="bg-medical-blue hover:bg-medical-blue/90">
            {isPending ? 'Booking…' : 'Book Appointment'}
          </Button>
        </div>
      </form>
    </div>
  );
}
