import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function WardManagementPage() {
  const { data: wards, isLoading } = useQuery({
    queryKey: ['ipd', 'wards'],
    queryFn: async () => {
      const res = await api.get<{ data: unknown[] }>('/ipd/wards');
      return res.data.data;
    },
  });

  const wardList = (wards ?? []) as {
    _id: string;
    name: string;
    type: string;
    totalBeds: number;
    beds: { _id: string; bedNumber: string; status: string; type: string }[];
  }[];

  const bedStatusColor: Record<string, string> = {
    available: 'bg-green-100 border-green-300 text-green-700',
    occupied: 'bg-red-100 border-red-300 text-red-700',
    reserved: 'bg-yellow-100 border-yellow-300 text-yellow-700',
    maintenance: 'bg-gray-100 border-gray-300 text-gray-500',
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ward Management</h1>
        <p className="text-sm text-muted-foreground">Real-time bed availability across all wards</p>
      </div>

      <div className="flex gap-4 text-sm">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-green-200 border border-green-400" />Available</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-red-200 border border-red-400" />Occupied</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-yellow-200 border border-yellow-400" />Reserved</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-gray-200 border border-gray-400" />Maintenance</span>
      </div>

      {wardList.map((ward) => {
        const available = ward.beds.filter((b) => b.status === 'available').length;
        return (
          <Card key={ward._id}>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">{ward.name}</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{ward.type} · {ward.totalBeds} beds total</p>
              </div>
              <Badge variant={available > 0 ? 'success' : 'destructive'}>
                {available} available
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-12 gap-2">
                {ward.beds.map((bed) => (
                  <div
                    key={bed._id}
                    className={cn('flex h-10 items-center justify-center rounded-lg border text-xs font-semibold cursor-default select-none transition-colors', bedStatusColor[bed.status] ?? 'bg-gray-100')}
                    title={`${bed.bedNumber} — ${bed.status}`}
                  >
                    {bed.bedNumber}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
