import { Package, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatCard } from './StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Props { data?: Record<string, unknown> }

export function PharmacyDashboard({ data }: Props) {
  const stats = data as {
    pendingDispensing?: number;
    lowStockCount?: number;
    dispensedToday?: number;
    expiringDrugs?: number;
    lowStockItems?: { name: string; stock: number; reorderLevel: number }[];
    pendingPrescriptions?: { _id: string; patientName: string; medications: number; prescribedBy: string }[];
  } | null;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pharmacy Dashboard</h1>
        <p className="text-sm text-muted-foreground">Manage dispensing and inventory</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Pending Dispensing" value={stats?.pendingDispensing ?? 0} icon={Clock} color="orange" />
        <StatCard title="Dispensed Today" value={stats?.dispensedToday ?? 0} icon={CheckCircle} color="green" />
        <StatCard title="Low Stock Items" value={stats?.lowStockCount ?? 0} icon={AlertTriangle} color="red" />
        <StatCard title="Expiring Soon" value={stats?.expiringDrugs ?? 0} subtitle="Within 30 days" icon={Package} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Pending Prescriptions</CardTitle>
            <Link to="/pharmacy"><Button variant="outline" size="sm">View All</Button></Link>
          </CardHeader>
          <CardContent>
            {(stats?.pendingPrescriptions ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No pending prescriptions</p>
            ) : (
              <div className="space-y-3">
                {(stats?.pendingPrescriptions ?? []).map((rx) => (
                  <div key={rx._id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium">{rx.patientName}</p>
                      <p className="text-xs text-muted-foreground">{rx.medications} medications · {rx.prescribedBy}</p>
                    </div>
                    <Button size="sm">Dispense</Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Low Stock Alerts</CardTitle></CardHeader>
          <CardContent>
            {(stats?.lowStockItems ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">All stock levels OK</p>
            ) : (
              <div className="space-y-3">
                {(stats?.lowStockItems ?? []).map((item) => (
                  <div key={item.name} className="flex items-center justify-between p-3 rounded-lg bg-red-50">
                    <div>
                      <p className="text-sm font-medium text-red-900">{item.name}</p>
                      <p className="text-xs text-red-600">Stock: {item.stock} · Reorder at: {item.reorderLevel}</p>
                    </div>
                    <Badge variant="destructive">Low</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
