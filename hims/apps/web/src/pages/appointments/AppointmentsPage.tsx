import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Calendar } from 'lucide-react';
import { useAppointments } from '@/hooks/useAppointments';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { APPOINTMENT_STATUS, type AppointmentStatus } from '@hims/shared';
import { formatDate } from '@/lib/utils';

interface Appointment {
  _id: string;
  tokenNumber?: number;
  patientId: { _id: string; firstName: string; lastName: string; uhid: string } | string;
  doctorId: { _id: string; firstName: string; lastName: string; specialization: string } | string;
  appointmentDate: string;
  type: string;
  status: AppointmentStatus;
}

const statusVariant: Record<AppointmentStatus, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  scheduled: 'secondary',
  confirmed: 'default',
  checked_in: 'warning',
  in_progress: 'default',
  completed: 'success',
  cancelled: 'destructive',
  no_show: 'destructive',
  rescheduled: 'secondary',
};

export function AppointmentsPage() {
  const [status, setStatus] = useState<AppointmentStatus | ''>('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useAppointments({
    status: status ? status : undefined,
    page,
    limit: 20,
    sortBy: 'appointmentDate',
    sortOrder: 'asc',
  });

  const appointments = (data?.data ?? []) as unknown as Appointment[];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="text-sm text-muted-foreground">{data?.meta?.pagination?.total ?? 0} total appointments</p>
        </div>
        <div className="flex gap-2">
          <Link to="/appointments/queue"><Button variant="outline">OPD Queue</Button></Link>
          <Link to="/appointments/new">
            <Button className="gap-2 bg-medical-blue hover:bg-medical-blue/90"><Plus className="h-4 w-4" />Book</Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Select value={status} onValueChange={(v) => { setStatus(v === 'all' ? '' : v as AppointmentStatus); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.values(APPOINTMENT_STATUS).map((s) => (
              <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900">No appointments found</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {appointments.map((apt) => (
              <Card key={apt._id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-medical-blue/10 text-medical-blue shrink-0">
                    <span className="text-sm font-bold">{apt.tokenNumber ?? '–'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {typeof apt.patientId === 'object' ? `${apt.patientId.firstName} ${apt.patientId.lastName}` : apt.patientId}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {typeof apt.doctorId === 'object' ? `Dr. ${apt.doctorId.firstName} ${apt.doctorId.lastName}` : apt.doctorId}
                      {' · '}{formatDate(apt.appointmentDate)} at {new Date(apt.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{apt.type}</Badge>
                    <Badge variant={statusVariant[apt.status] ?? 'secondary'}>{apt.status.replace(/_/g, ' ')}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {(data?.meta?.pagination?.totalPages ?? 1) > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <span className="flex items-center text-sm text-muted-foreground px-3">Page {page} of {data?.meta?.pagination?.totalPages}</span>
              <Button variant="outline" size="sm" disabled={page === data?.meta?.pagination?.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
