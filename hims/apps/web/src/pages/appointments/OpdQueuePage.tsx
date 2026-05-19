import { useTodayQueue } from '@/hooks/useAppointments';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const statusColor: Record<string, 'secondary' | 'warning' | 'default' | 'success' | 'destructive'> = {
  waiting: 'secondary',
  checked_in: 'warning',
  in_progress: 'default',
  completed: 'success',
  no_show: 'destructive',
};

export function OpdQueuePage() {
  const { data: queue, isLoading } = useTodayQueue();
  const qc = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/appointments/${id}/status`, { status }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['appointments', 'queue'] });
      toast.success('Status updated');
    },
  });

  const nextStatus: Record<string, string> = {
    waiting: 'checked_in',
    checked_in: 'in_progress',
    in_progress: 'completed',
  };

  const nextLabel: Record<string, string> = {
    waiting: 'Check In',
    checked_in: 'Start',
    in_progress: 'Complete',
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  const appointments = (queue ?? []) as {
    _id: string; tokenNumber: number; patientName?: string; doctorName?: string; chiefComplaint?: string; status: string;
  }[];

  const active = appointments.filter((a) => !['completed', 'no_show', 'cancelled'].includes(a.status));
  const done = appointments.filter((a) => ['completed', 'no_show'].includes(a.status));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">OPD Queue</h1>
          <p className="text-sm text-muted-foreground">
            {active.length} waiting · {done.length} completed today
          </p>
        </div>
        <div className="text-2xl font-bold text-medical-blue">
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Active Queue</CardTitle></CardHeader>
        <CardContent>
          {active.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No active patients in queue</p>
          ) : (
            <div className="space-y-3">
              {active.map((apt) => (
                <div key={apt._id} className="flex items-center gap-4 p-4 rounded-xl border-2 border-transparent hover:border-medical-blue/20 transition-colors">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-medical-blue text-white font-bold text-lg shrink-0">
                    {apt.tokenNumber}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{apt.patientName ?? 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground">{apt.doctorName ?? ''}</p>
                    {apt.chiefComplaint && <p className="text-xs text-muted-foreground mt-0.5 truncate">{apt.chiefComplaint}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusColor[apt.status]}>{apt.status.replace('_', ' ')}</Badge>
                    {nextStatus[apt.status] && (
                      <Button
                        size="sm"
                        onClick={() => updateStatus.mutate({ id: apt._id, status: nextStatus[apt.status] ?? '' })}
                        disabled={updateStatus.isPending}
                      >
                        {nextLabel[apt.status]}
                      </Button>
                    )}
                    {apt.status !== 'completed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => updateStatus.mutate({ id: apt._id, status: 'no_show' })}
                      >
                        No Show
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {done.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base text-muted-foreground">Completed</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {done.map((apt) => (
                <div key={apt._id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 opacity-75">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground font-bold text-sm shrink-0">
                    {apt.tokenNumber}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{apt.patientName}</p>
                  </div>
                  <Badge variant={statusColor[apt.status]}>{apt.status.replace('_', ' ')}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
