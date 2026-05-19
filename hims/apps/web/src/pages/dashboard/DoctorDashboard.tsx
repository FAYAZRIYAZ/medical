import { Calendar, Users, ClipboardList, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatCard } from './StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth.store';

interface Props { data?: Record<string, unknown> }

export function DoctorDashboard({ data }: Props) {
  const { user } = useAuthStore();
  const stats = data as {
    todayAppointments?: number;
    totalPatients?: number;
    pendingPrescriptions?: number;
    telemedicineToday?: number;
    upcomingAppointments?: { _id: string; patientName: string; time: string; type: string; status: string }[];
  } | null;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Good morning, Dr. {user?.firstName}</h1>
        <p className="text-sm text-muted-foreground">Here's your schedule for today</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Today's Appointments" value={stats?.todayAppointments ?? 0} icon={Calendar} color="blue" />
        <StatCard title="My Patients" value={stats?.totalPatients ?? 0} icon={Users} color="teal" />
        <StatCard title="Pending Prescriptions" value={stats?.pendingPrescriptions ?? 0} icon={ClipboardList} color="orange" />
        <StatCard title="Telemedicine Today" value={stats?.telemedicineToday ?? 0} icon={Video} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Today's Queue</CardTitle>
            <Link to="/appointments/queue"><Button variant="outline" size="sm">View All</Button></Link>
          </CardHeader>
          <CardContent>
            {(stats?.upcomingAppointments ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No appointments today</p>
            ) : (
              <div className="space-y-3">
                {(stats?.upcomingAppointments ?? []).map((apt) => (
                  <div key={apt._id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">{apt.patientName}</p>
                      <p className="text-xs text-muted-foreground">{apt.time} · {apt.type}</p>
                    </div>
                    <Badge variant={apt.status === 'confirmed' ? 'default' : 'secondary'}>{apt.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Link to="/patients/new">
              <Button variant="outline" className="w-full h-16 flex-col gap-1 text-xs">
                <Users className="h-5 w-5" />
                New Patient
              </Button>
            </Link>
            <Link to="/appointments">
              <Button variant="outline" className="w-full h-16 flex-col gap-1 text-xs">
                <Calendar className="h-5 w-5" />
                Schedule
              </Button>
            </Link>
            <Link to="/appointments/queue">
              <Button variant="outline" className="w-full h-16 flex-col gap-1 text-xs">
                <ClipboardList className="h-5 w-5" />
                OPD Queue
              </Button>
            </Link>
            <Link to="/lab">
              <Button variant="outline" className="w-full h-16 flex-col gap-1 text-xs">
                <ClipboardList className="h-5 w-5" />
                Lab Orders
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
