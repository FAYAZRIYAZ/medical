import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Video, Calendar, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate } from '@/lib/utils';

interface TeleAppointment {
  _id: string;
  tokenNumber?: number;
  appointmentDate: string;
  slotTime: string;
  status: string;
  type: string;
  livekitRoomName?: string;
  chiefComplaint?: string;
  patientId: { firstName: string; lastName: string; uhid: string } | string;
  doctorId: { firstName: string; lastName: string; specialization: string } | string;
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  scheduled: 'secondary',
  confirmed: 'default',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'destructive',
};

export function TelemedicineListPage() {
  const [filter, setFilter] = useState<'upcoming' | 'all'>('upcoming');

  const today = new Date().toISOString().split('T')[0]!;

  const { data, isLoading } = useQuery({
    queryKey: ['telemedicine', 'list', filter],
    queryFn: async () => {
      const params: Record<string, string> = { type: 'telemedicine', limit: '30', sortBy: 'appointmentDate', sortOrder: 'asc' };
      if (filter === 'upcoming') params['dateFrom'] = today;
      const res = await api.get<{ success: boolean; data: TeleAppointment[] }>('/appointments', { params });
      return res.data.data;
    },
    refetchInterval: 30_000,
  });

  const appointments = data ?? [];

  const patientName = (apt: TeleAppointment) =>
    typeof apt.patientId === 'object'
      ? `${apt.patientId.firstName} ${apt.patientId.lastName}`
      : apt.patientId;

  const doctorName = (apt: TeleAppointment) =>
    typeof apt.doctorId === 'object'
      ? `Dr. ${apt.doctorId.firstName} ${apt.doctorId.lastName}`
      : apt.doctorId;

  const canJoin = (apt: TeleAppointment) =>
    ['scheduled', 'confirmed', 'in_progress'].includes(apt.status) && apt.livekitRoomName;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Telemedicine</h1>
          <p className="text-sm text-muted-foreground">Virtual consultations via video call</p>
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as 'upcoming' | 'all')}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-20">
          <Video className="h-14 w-14 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900">No telemedicine appointments</p>
          <p className="text-sm text-muted-foreground mt-1">
            Book a telemedicine appointment from the Appointments page
          </p>
          <Link to="/appointments/new" className="mt-4 inline-block">
            <Button className="bg-medical-blue hover:bg-medical-blue/90">Book Appointment</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((apt) => {
            const apptDate = new Date(apt.appointmentDate);
            const isToday = apptDate.toDateString() === new Date().toDateString();
            const joinable = canJoin(apt);

            return (
              <Card key={apt._id} className={`transition-shadow ${joinable ? 'border-medical-blue/30 bg-blue-50/30' : 'hover:shadow-sm'}`}>
                <CardContent className="p-4 flex items-center gap-4">
                  {/* Video icon / token */}
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full shrink-0 ${joinable ? 'bg-medical-blue text-white' : 'bg-muted text-muted-foreground'}`}>
                    <Video className="h-5 w-5" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{patientName(apt)}</p>
                    <p className="text-sm text-muted-foreground truncate">{doctorName(apt)}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {isToday ? 'Today' : formatDate(apt.appointmentDate)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {apt.slotTime}
                      </span>
                    </div>
                    {apt.chiefComplaint && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">cc: {apt.chiefComplaint}</p>
                    )}
                  </div>

                  {/* Status + action */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Badge variant={STATUS_VARIANT[apt.status] ?? 'secondary'}>
                      {apt.status.replace(/_/g, ' ')}
                    </Badge>
                    {joinable ? (
                      <Link to={`/telemedicine/${apt._id}`}>
                        <Button size="sm" className="bg-medical-blue hover:bg-medical-blue/90 gap-1.5">
                          <Video className="h-3.5 w-3.5" /> Join
                        </Button>
                      </Link>
                    ) : apt.status === 'completed' ? (
                      <span className="text-xs text-muted-foreground">Completed</span>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
