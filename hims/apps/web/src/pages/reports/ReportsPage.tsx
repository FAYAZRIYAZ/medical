import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, Users, Calendar, DollarSign, Activity, Mail, MessageCircle, RefreshCw } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface DashboardStats {
  todayAppointments: number;
  activeAdmissions: number;
  todayNewPatients: number;
  totalPatients: number;
  todayRevenue: number;
  monthRevenue: number;
  pendingLabOrders: number;
  lowStockCount: number;
}

export function ReportsPage() {
  const { data: stats, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['reports', 'dashboard'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: DashboardStats }>('/dashboard/admin');
      return res.data.data;
    },
  });

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const buildReportText = () => {
    const s = stats;
    return [
      `HIMS Daily Hospital Report`,
      `Date: ${today}`,
      ``,
      `-- PATIENT SUMMARY --`,
      `Today's Appointments : ${s?.todayAppointments ?? 0}`,
      `New Patients Today   : ${s?.todayNewPatients ?? 0}`,
      `Total Patients       : ${s?.totalPatients ?? 0}`,
      `Active IPD Patients  : ${s?.activeAdmissions ?? 0}`,
      ``,
      `-- FINANCIALS --`,
      `Today's Revenue : ${formatCurrency(s?.todayRevenue ?? 0)}`,
      `Month's Revenue : ${formatCurrency(s?.monthRevenue ?? 0)}`,
      ``,
      `-- OPERATIONS --`,
      `Pending Lab Orders : ${s?.pendingLabOrders ?? 0}`,
      `Low Stock Alerts   : ${s?.lowStockCount ?? 0}`,
      ``,
      `City General Hospital | Helpline: 9347832031`,
    ].join('\n');
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`HIMS Daily Report — ${new Date().toLocaleDateString()}`);
    const body = encodeURIComponent(buildReportText());
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(buildReportText());
    window.open(`https://wa.me/?text=${text}`);
  };

  const statCards = [
    { label: "Today's Appointments", value: stats?.todayAppointments ?? 0, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'New Patients Today', value: stats?.todayNewPatients ?? 0, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Total Patients', value: stats?.totalPatients ?? 0, icon: Users, color: 'text-gray-700', bg: 'bg-gray-100' },
    { label: 'Active IPD', value: stats?.activeAdmissions ?? 0, icon: Activity, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-muted-foreground">Daily summary and hospital analytics</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={shareViaEmail}
            disabled={isLoading}
          >
            <Mail className="h-4 w-4" /> Email Report
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-green-700 border-green-300 hover:bg-green-50"
            onClick={shareViaWhatsApp}
            disabled={isLoading}
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </Button>
        </div>
      </div>

      {/* Date banner */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 px-4 py-2 rounded-lg">
        <BarChart3 className="h-4 w-4" />
        <span>Report for: <strong className="text-gray-700">{today}</strong></span>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCards.map((item) => (
              <Card key={item.label}>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className={`${item.bg} ${item.color} p-2 rounded-lg`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{item.value.toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Revenue + Operations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600" /> Revenue
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center p-3 rounded-lg bg-green-50 border border-green-100">
                  <div>
                    <p className="text-xs text-green-700 font-medium">Today's Revenue</p>
                    <p className="text-xs text-green-600">Payments received today</p>
                  </div>
                  <p className="text-xl font-bold text-green-700">{formatCurrency(stats?.todayRevenue ?? 0)}</p>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <div>
                    <p className="text-xs text-blue-700 font-medium">Month's Revenue</p>
                    <p className="text-xs text-blue-600">Total this month</p>
                  </div>
                  <p className="text-xl font-bold text-blue-700">{formatCurrency(stats?.monthRevenue ?? 0)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-amber-600" /> Operations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center p-3 rounded-lg bg-amber-50 border border-amber-100">
                  <div>
                    <p className="text-xs text-amber-700 font-medium">Pending Lab Orders</p>
                    <p className="text-xs text-amber-600">Awaiting processing</p>
                  </div>
                  <p className="text-xl font-bold text-amber-700">{stats?.pendingLabOrders ?? 0}</p>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-red-50 border border-red-100">
                  <div>
                    <p className="text-xs text-red-700 font-medium">Low Stock Alerts</p>
                    <p className="text-xs text-red-600">Drugs below minimum level</p>
                  </div>
                  <p className="text-xl font-bold text-red-700">{stats?.lowStockCount ?? 0}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Report preview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Report Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs text-muted-foreground bg-muted/50 p-4 rounded-lg whitespace-pre-wrap font-mono">
                {buildReportText()}
              </pre>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
