import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { CreateAppointmentSchema, type CreateAppointmentInput } from '@hims/shared';
import { useCreateAppointment, useDoctorSlots } from '@/hooks/useAppointments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface Doctor {
  _id: string;
  userId: { firstName?: string; lastName?: string };
  specialization: string;
  departmentId?: string;
}

export function NewAppointmentPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const patientId = params.get('patientId') ?? '';

  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');

  const { mutate, isPending } = useCreateAppointment();

  const { data: doctors } = useQuery({
    queryKey: ['doctors', 'list'],
    queryFn: async () => {
      const res = await api.get<{ data: { data: Doctor[] } }>('/doctors');
      return res.data.data.data;
    },
  });

  const { data: slots } = useDoctorSlots(selectedDoctor, selectedDate);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<CreateAppointmentInput>({
    resolver: zodResolver(CreateAppointmentSchema),
    defaultValues: { patientId, type: 'in_person' },
  });

  useEffect(() => {
    if (patientId) setValue('patientId', patientId);
  }, [patientId, setValue]);

  const selectedDoctorData = (doctors ?? []).find((d) => d._id === selectedDoctor);

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
            <div>
              <label className="mb-1.5 block text-sm font-medium">Patient ID *</label>
              <Input {...register('patientId')} placeholder="Patient UHID or ID" />
              {errors.patientId && <p className="mt-1 text-xs text-red-600">{errors.patientId.message}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Doctor *</label>
              <Select onValueChange={(v) => {
                setValue('doctorId', v);
                setSelectedDoctor(v);
                const doc = (doctors ?? []).find((d) => d._id === v);
                if (doc?.departmentId) setValue('departmentId', doc.departmentId);
              }}>
                <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                <SelectContent>
                  {(doctors ?? []).map((d) => (
                    <SelectItem key={d._id} value={d._id}>
                      {d.userId.firstName ?? ''} {d.userId.lastName ?? ''} — {d.specialization}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.doctorId && <p className="mt-1 text-xs text-red-600">{errors.doctorId.message}</p>}
            </div>

            {!selectedDoctorData?.departmentId && (
              <div>
                <label className="mb-1.5 block text-sm font-medium">Department ID *</label>
                <Input {...register('departmentId')} placeholder="Department ID" />
                {errors.departmentId && <p className="mt-1 text-xs text-red-600">{errors.departmentId.message}</p>}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium">Date *</label>
              <Input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setValue('appointmentDate', e.target.value);
                }}
              />
              {errors.appointmentDate && <p className="mt-1 text-xs text-red-600">{errors.appointmentDate.message}</p>}
            </div>

            {slots && slots.length > 0 && (
              <div>
                <label className="mb-1.5 block text-sm font-medium">Time Slot *</label>
                <div className="grid grid-cols-4 gap-2">
                  {slots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      className={`p-2 text-xs rounded-lg border transition-colors ${selectedSlot === slot ? 'bg-medical-blue text-white border-medical-blue' : 'hover:border-medical-blue'}`}
                      onClick={() => { setValue('slotId', slot); setSelectedSlot(slot); }}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
                {errors.slotId && <p className="mt-1 text-xs text-red-600">{errors.slotId.message}</p>}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium">Type *</label>
              <Select defaultValue="in_person" onValueChange={(v) => setValue('type', v as CreateAppointmentInput['type'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_person">In-Person</SelectItem>
                  <SelectItem value="telemedicine">Telemedicine</SelectItem>
                  <SelectItem value="walk_in">Walk-in</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Chief Complaint</label>
              <Textarea {...register('chiefComplaint')} placeholder="Describe the reason for visit..." rows={3} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" loading={isPending} className="bg-medical-blue hover:bg-medical-blue/90">Book Appointment</Button>
        </div>
      </form>
    </div>
  );
}
