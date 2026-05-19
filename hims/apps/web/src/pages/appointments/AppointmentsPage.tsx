import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Calendar, Pencil, X } from 'lucide-react';
import { useAppointments, useUpdateAppointment } from '@/hooks/useAppointments';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { APPOINTMENT_STATUS, type AppointmentStatus } from '@hims/shared';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

interface Appointment {
  _id: string;
  tokenNumber?: number;
  patientId: { _id: string; firstName: string; lastName: string; uhid: string } | string;
  doctorId: { _id: string; firstName: string; lastName: string; specialization: string } | string;
  appointmentDate: string;
  type: string;
  status: AppointmentStatus;
  chiefComplaint?: string;
  notes?: string;
}

const statusVariant: Record<AppointmentStatus, 'default' | 'secondary' | 'warning' | 'destructive'> = {
  scheduled: 'secondary',
  confirmed: 'default',
  checked_in: 'warning',
  in_progress: 'default',
  completed: 'default',
  cancelled: 'destructive',
  no_show: 'destructive',
  rescheduled: 'secondary',
};

const EDITABLE_STATUSES: AppointmentStatus[] = [
  APPOINTMENT_STATUS.CONFIRMED,
  APPOINTMENT_STATUS.CHECKED_IN,
  APPOINTMENT_STATUS.IN_PROGRESS,
  APPOINTMENT_STATUS.COMPLETED,
  APPOINTMENT_STATUS.CANCELLED,
  APPOINTMENT_STATUS.NO_SHOW,
];

function EditAppointmentDialog({ apt, onClose }: { apt: Appointment; onClose: () => void }) {
  const [status, setStatus] = useState<AppointmentStatus>(apt.status);
  const [notes, setNotes] = useState(apt.notes ?? '');
  const [cancellationReason, setCancellationReason] = useState('');
  const update = useUpdateAppointment(apt._id);

  const save = () => {
    update.mutate(
      { status, notes: notes || undefined, cancellationReason: cancellationReason || undefined },
      {
        onSuccess: () => { toast.success('Appointment updated'); onClose(); },
        onError: () => toast.error('Failed to update appointment'),
      }
    );
  };

  const patientName = typeof apt.patientId === 'object'
    ? `${apt.patientId.firstName} ${apt.patientId.lastName}`
    : apt.patientId;
  const doctorName = typeof apt.doctorId === 'object'
    ? `Dr. ${apt.doctorId.firstName} ${apt.doctorId.lastName}`
    : apt.doctorId;

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Edit Appointment</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 mt-2">
        <div className="rounded-lg bg-muted/40 p-3 space-y-1">
          <p className="text-sm font-medium">{patientName}</p>
          <p className="text-xs text-muted-foreground">{doctorName} · {formatDate(apt.appointmentDate)}</p>
          {apt.chiefComplaint && <p className="text-xs text-muted-foreground">CC: {apt.chiefComplaint}</p>}
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Status</label>
          <Select value={status} onValueChange={(v) => setStatus(v as AppointmentStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {EDITABLE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {(status === APPOINTMENT_STATUS.CANCELLED || status === APPOINTMENT_STATUS.NO_SHOW) && (
          <div>
            <label className="text-sm font-medium mb-1.5 block">Reason</label>
            <Textarea
              rows={2}
              placeholder="Reason for cancellation..."
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
            />
          </div>
        )}

        <div>
          <label className="text-sm font-medium mb-1.5 block">Internal Notes</label>
          <Textarea
            rows={3}
            placeholder="Add notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={update.isPending} className="bg-medical-blue hover:bg-medical-blue/90">
            {update.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

export function AppointmentsPage() {
  const [status, setStatus] = useState<AppointmentStatus | ''>('');
  const [page, setPage] = useState(1);
  const [editingApt, setEditingApt] = useState<Appointment | null>(null);

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
                      {' · '}{formatDate(apt.appointmentDate)}
                    </p>
                    {apt.chiefComplaint && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{apt.chiefComplaint}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-xs">{apt.type.replace(/_/g, ' ')}</Badge>
                    <Badge variant={statusVariant[apt.status] ?? 'secondary'}>{apt.status.replace(/_/g, ' ')}</Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => setEditingApt(apt)}
                      title="Edit appointment"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {apt.status !== APPOINTMENT_STATUS.CANCELLED && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        title="Cancel appointment"
                        onClick={() => {
                          setEditingApt({ ...apt, status: APPOINTMENT_STATUS.CANCELLED });
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
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

      <Dialog open={!!editingApt} onOpenChange={(open) => { if (!open) setEditingApt(null); }}>
        {editingApt && <EditAppointmentDialog apt={editingApt} onClose={() => setEditingApt(null)} />}
      </Dialog>
    </div>
  );
}
