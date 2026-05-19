import { Calendar, Users, Clock, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatCard } from './StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Props { data?: Record<string, unknown> }

export function ReceptionDashboard({ data }: Props) {
  const stats = data as {
    todayAppointments?: number;
    checkedIn?: number;
    waiting?: number;
    newRegistrations?: number;
    queue?: { _id: string; tokenNumber: number; patientName: string; doctorName: string; status: string }[];
  } | null;

  const statusColors: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
    waiting: 'warning',
    checked_in: 'success',
    in_progress: 'default',
    completed: 'secondary',
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reception Desk</h1>
          <p className="text-sm text-muted-foreground">Manage appointments and patient check-ins</p>
        </div>
        <Link to="/appointments/new">
          <Button className="bg-medical-blue hover:bg-medical-blue/90">+ New Appointment</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Today's Appointments" value={stats?.todayAppointments ?? 0} icon={Calendar} color="blue" />
        <StatCard title="Checked In" value={stats?.checkedIn ?? 0} icon={CheckCircle} color="green" />
        <StatCard title="Waiting" value={stats?.waiting ?? 0} icon={Clock} color="orange" />
        <StatCard title="New Registrations" value={stats?.newRegistrations ?? 0} icon={Users} color="teal" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Today's OPD Queue</CardTitle>
          <Link to="/appointments/queue"><Button variant="outline" size="sm">Full View</Button></Link>
        </CardHeader>
        <CardContent>
          {(stats?.queue ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No patients in queue</p>
          ) : (
            <div className="space-y-2">
              {(stats?.queue ?? []).map((q) => (
                <div key={q._id} className="flex items-center gap-4 p-3 rounded-lg border">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-medical-blue text-white text-sm font-bold shrink-0">
                    {q.tokenNumber}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{q.patientName}</p>
                    <p className="text-xs text-muted-foreground">{q.doctorName}</p>
                  </div>
                  <Badge variant={statusColors[q.status] ?? 'secondary'}>{q.status.replace('_', ' ')}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link to="/patients/new"><Button variant="outline" className="w-full h-16 flex-col gap-1 text-xs"><Users className="h-5 w-5" />Register Patient</Button></Link>
        <Link to="/appointments/new"><Button variant="outline" className="w-full h-16 flex-col gap-1 text-xs"><Calendar className="h-5 w-5" />Book Appointment</Button></Link>
        <Link to="/billing/new"><Button variant="outline" className="w-full h-16 flex-col gap-1 text-xs"><CheckCircle className="h-5 w-5" />Create Invoice</Button></Link>
        <Link to="/patients"><Button variant="outline" className="w-full h-16 flex-col gap-1 text-xs"><Users className="h-5 w-5" />All Patients</Button></Link>
      </div>
    </div>
  );
}
