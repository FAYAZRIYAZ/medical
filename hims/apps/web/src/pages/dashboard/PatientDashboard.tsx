import { Calendar, FileText, Video, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatCard } from './StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth.store';

interface Props { data?: Record<string, unknown> }

export function PatientDashboard({ data }: Props) {
  const { user } = useAuthStore();
  const stats = data as {
    upcomingAppointments?: number;
    totalVisits?: number;
    pendingReports?: number;
    notifications?: number;
    nextAppointment?: { date: string; time: string; doctorName: string; type: string } | null;
    recentPrescriptions?: { _id: string; date: string; doctorName: string; medications: number }[];
  } | null;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.firstName}</h1>
        <p className="text-sm text-muted-foreground">Manage your health records and appointments</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Upcoming Appointments" value={stats?.upcomingAppointments ?? 0} icon={Calendar} color="blue" />
        <StatCard title="Total Visits" value={stats?.totalVisits ?? 0} icon={FileText} color="teal" />
        <StatCard title="Lab Reports" value={stats?.pendingReports ?? 0} subtitle="Ready to view" icon={FileText} color="green" />
        <StatCard title="Notifications" value={stats?.notifications ?? 0} icon={Bell} color="orange" />
      </div>

      {stats?.nextAppointment && (
        <Card className="border-medical-blue border-2">
          <CardHeader><CardTitle className="text-base text-medical-blue">Next Appointment</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{stats.nextAppointment.doctorName}</p>
              <p className="text-sm text-muted-foreground">{stats.nextAppointment.date} at {stats.nextAppointment.time}</p>
              <Badge className="mt-2" variant="outline">{stats.nextAppointment.type}</Badge>
            </div>
            {stats.nextAppointment.type === 'telemedicine' && (
              <Link to={`/telemedicine/apt-room`}>
                <Button className="gap-2 bg-medical-blue hover:bg-medical-blue/90">
                  <Video className="h-4 w-4" /> Join Call
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Prescriptions</CardTitle>
          </CardHeader>
          <CardContent>
            {(stats?.recentPrescriptions ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No prescriptions yet</p>
            ) : (
              <div className="space-y-3">
                {(stats?.recentPrescriptions ?? []).map((rx) => (
                  <div key={rx._id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">{rx.doctorName}</p>
                      <p className="text-xs text-muted-foreground">{new Date(rx.date).toLocaleDateString()} · {rx.medications} medications</p>
                    </div>
                    <Button size="sm" variant="outline">Download</Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Link to="/appointments/new"><Button variant="outline" className="w-full h-16 flex-col gap-1 text-xs"><Calendar className="h-5 w-5" />Book Appointment</Button></Link>
            <Link to="/lab"><Button variant="outline" className="w-full h-16 flex-col gap-1 text-xs"><FileText className="h-5 w-5" />My Reports</Button></Link>
            <Link to="/billing"><Button variant="outline" className="w-full h-16 flex-col gap-1 text-xs"><FileText className="h-5 w-5" />My Bills</Button></Link>
            <Link to="/chat"><Button variant="outline" className="w-full h-16 flex-col gap-1 text-xs"><Bell className="h-5 w-5" />Messages</Button></Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
