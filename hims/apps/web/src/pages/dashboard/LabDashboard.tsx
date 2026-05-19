import { FlaskConical, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StatCard } from './StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Props { data?: Record<string, unknown> }

export function LabDashboard({ data }: Props) {
  const stats = data as {
    pendingOrders?: number;
    sampleCollected?: number;
    resultsEntered?: number;
    completedToday?: number;
    pendingList?: { _id: string; patientName: string; testName: string; orderedAt: string; status: string }[];
  } | null;

  const statusColor: Record<string, 'warning' | 'default' | 'success' | 'secondary'> = {
    ordered: 'warning',
    sample_collected: 'default',
    result_entered: 'default',
    verified: 'success',
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Laboratory Dashboard</h1>
        <p className="text-sm text-muted-foreground">Manage lab orders and test results</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Pending Orders" value={stats?.pendingOrders ?? 0} icon={Clock} color="orange" />
        <StatCard title="Sample Collected" value={stats?.sampleCollected ?? 0} icon={FlaskConical} color="blue" />
        <StatCard title="Results Entered" value={stats?.resultsEntered ?? 0} icon={AlertCircle} color="purple" />
        <StatCard title="Completed Today" value={stats?.completedToday ?? 0} icon={CheckCircle} color="green" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Pending Lab Orders</CardTitle>
          <Link to="/lab"><Button variant="outline" size="sm">View All</Button></Link>
        </CardHeader>
        <CardContent>
          {(stats?.pendingList ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No pending orders</p>
          ) : (
            <div className="space-y-3">
              {(stats?.pendingList ?? []).map((order) => (
                <Link key={order._id} to={`/lab/${order._id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                    <div>
                      <p className="text-sm font-medium">{order.patientName}</p>
                      <p className="text-xs text-muted-foreground">{order.testName} · {new Date(order.orderedAt).toLocaleDateString()}</p>
                    </div>
                    <Badge variant={statusColor[order.status] ?? 'secondary'}>{order.status.replace('_', ' ')}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
