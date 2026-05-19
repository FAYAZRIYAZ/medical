import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FlaskConical, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LAB_ORDER_STATUS } from '@hims/shared';
import { useDebounce } from '@/hooks/useDebounce';

const statusVariant: Record<string, 'secondary' | 'warning' | 'default' | 'success' | 'destructive'> = {
  ordered: 'secondary',
  sample_collected: 'warning',
  result_entered: 'default',
  verified: 'success',
  rejected: 'destructive',
};

export function LabPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ['lab', 'orders', { search: debouncedSearch, status, page }],
    queryFn: async () => {
      const res = await api.get<{ data: unknown[]; meta: { pagination: { total: number; totalPages: number } } }>('/lab/orders', {
        params: { search: debouncedSearch, status: status || undefined, page, limit: 20 },
      });
      return { data: res.data.data, meta: res.data.meta };
    },
  });

  const orders = (data?.data ?? []) as {
    _id: string;
    patientId: { firstName: string; lastName: string; uhid: string };
    items: { testId: { name: string } }[];
    orderedBy: { name: string };
    status: string;
    createdAt: string;
  }[];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Laboratory</h1>
        <p className="text-sm text-muted-foreground">{data?.meta?.pagination?.total ?? 0} lab orders</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by patient name or UHID..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.values(LAB_ORDER_STATUS).map((s) => (
              <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16">
          <FlaskConical className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium">No lab orders found</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {orders.map((order) => (
              <Link key={order._id} to={`/lab/${order._id}`}>
                <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-50 text-purple-600 shrink-0">
                      <FlaskConical className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{order.patientId ? `${order.patientId.firstName} ${order.patientId.lastName}` : 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">{order.patientId?.uhid} · {order.items?.length ?? 0} test(s)</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{order.items?.slice(0, 2).map((i) => i.testId?.name).join(', ')}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</p>
                      <Badge variant={statusVariant[order.status] ?? 'secondary'} className="mt-1">
                        {order.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          {(data?.meta?.pagination?.totalPages ?? 1) > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <span className="flex items-center text-sm px-3">Page {page} of {data?.meta?.pagination?.totalPages}</span>
              <Button variant="outline" size="sm" disabled={page === data?.meta?.pagination?.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
