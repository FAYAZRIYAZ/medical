import { Users, Calendar, BedDouble, DollarSign, Activity, TrendingUp, Package, FlaskConical } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { StatCard } from './StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

interface Props {
  data?: Record<string, unknown>;
}

export function AdminDashboard({ data }: Props) {
  const stats = data as {
    totalPatients?: number;
    todayAppointments?: number;
    occupiedBeds?: number;
    totalBeds?: number;
    todayRevenue?: number;
    monthRevenue?: number;
    pendingLabOrders?: number;
    lowStockDrugs?: number;
    revenueByDay?: { date: string; amount: number }[];
    appointmentsByDept?: { department: string; count: number }[];
    recentAdmissions?: { uhid: string; name: string; ward: string; admittedAt: string }[];
  } | null;

  const revenueData = stats?.revenueByDay ?? [
    { date: 'Mon', amount: 45000 }, { date: 'Tue', amount: 62000 }, { date: 'Wed', amount: 38000 },
    { date: 'Thu', amount: 71000 }, { date: 'Fri', amount: 55000 }, { date: 'Sat', amount: 48000 },
    { date: 'Sun', amount: 29000 },
  ];

  const deptData = stats?.appointmentsByDept ?? [
    { department: 'General', count: 42 }, { department: 'Cardiology', count: 28 },
    { department: 'Pediatrics', count: 35 }, { department: 'Ortho', count: 19 },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hospital Overview</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Real-time hospital operations dashboard</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Patients" value={stats?.totalPatients ?? 0} subtitle="Registered" icon={Users} color="blue" />
        <StatCard title="Today's Appointments" value={stats?.todayAppointments ?? 0} subtitle="Scheduled" icon={Calendar} color="teal" />
        <StatCard
          title="Bed Occupancy"
          value={`${stats?.occupiedBeds ?? 0}/${stats?.totalBeds ?? 0}`}
          subtitle={`${stats?.totalBeds ? Math.round(((stats.occupiedBeds ?? 0) / stats.totalBeds) * 100) : 0}% occupied`}
          icon={BedDouble}
          color="orange"
        />
        <StatCard title="Today's Revenue" value={formatCurrency(stats?.todayRevenue ?? 0)} subtitle={`Month: ${formatCurrency(stats?.monthRevenue ?? 0)}`} icon={DollarSign} color="green" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Pending Lab Orders" value={stats?.pendingLabOrders ?? 0} icon={FlaskConical} color="purple" />
        <StatCard title="Low Stock Alerts" value={stats?.lowStockDrugs ?? 0} subtitle="Drugs below reorder level" icon={Package} color="red" />
        <StatCard title="Active Patients" value={stats?.occupiedBeds ?? 0} subtitle="IPD admissions" icon={Activity} color="teal" />
        <StatCard title="Monthly Growth" value="+12%" subtitle="vs last month" icon={TrendingUp} color="green" trend={{ value: 12, label: 'vs last month' }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Revenue (Last 7 Days)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Line type="monotone" dataKey="amount" stroke="#1d4ed8" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Appointments by Department</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={deptData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="department" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {stats?.recentAdmissions && stats.recentAdmissions.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Recent IPD Admissions</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentAdmissions.map((a) => (
                <div key={a.uhid} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.uhid}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline">{a.ward}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(a.admittedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
