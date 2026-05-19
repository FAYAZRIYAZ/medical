import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, Plus, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { INVOICE_STATUS } from '@hims/shared';
import { formatCurrency } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';

const statusVariant: Record<string, 'secondary' | 'warning' | 'success' | 'destructive'> = {
  draft: 'secondary',
  issued: 'warning',
  partial: 'warning',
  overdue: 'destructive',
  paid: 'success',
  cancelled: 'destructive',
  refunded: 'secondary',
};

export function BillingPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ['billing', 'invoices', { search: debouncedSearch, status, page }],
    queryFn: async () => {
      const res = await api.get<{ data: unknown[]; meta: { pagination: { total: number; totalPages: number } } }>('/billing/invoices', {
        params: { search: debouncedSearch, status: status || undefined, page, limit: 20 },
      });
      return { data: res.data.data, meta: res.data.meta };
    },
  });

  const invoices = (data?.data ?? []) as {
    _id: string; invoiceNumber: string; patientId: { firstName: string; lastName: string; uhid: string };
    totalAmount: number; status: string; createdAt: string;
  }[];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
          <p className="text-sm text-muted-foreground">{data?.meta?.pagination?.total ?? 0} invoices</p>
        </div>
        <Link to="/billing/new">
          <Button className="gap-2 bg-medical-blue hover:bg-medical-blue/90"><Plus className="h-4 w-4" />New Invoice</Button>
        </Link>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by patient or invoice number..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {Object.values(INVOICE_STATUS).map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-16">
          <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium">No invoices found</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {invoices.map((inv) => (
              <Link key={inv._id} to={`/billing/${inv._id}`}>
                <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 text-green-600 shrink-0">
                      <DollarSign className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{inv.invoiceNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {inv.patientId ? `${inv.patientId.firstName} ${inv.patientId.lastName}` : '—'} · {inv.patientId?.uhid}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-gray-900">{formatCurrency(inv.totalAmount)}</p>
                      <div className="flex items-center gap-2 mt-1 justify-end">
                        <p className="text-xs text-muted-foreground">{new Date(inv.createdAt).toLocaleDateString()}</p>
                        <Badge variant={statusVariant[inv.status] ?? 'secondary'}>{inv.status}</Badge>
                      </div>
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
