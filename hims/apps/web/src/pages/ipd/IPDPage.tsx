import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BedDouble, Plus, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { calculateAge } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';

export function IPDPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('active');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ['ipd', 'admissions', { search: debouncedSearch, status, page }],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: unknown[]; meta: { pagination: { total: number; totalPages: number } } }>('/ipd/admissions', {
        params: { search: debouncedSearch, status, page, limit: 20 },
      });
      return { data: res.data.data, meta: res.data.meta };
    },
  });

  const admissions = (data?.data ?? []) as {
    _id: string;
    patientId: { firstName: string; lastName: string; uhid: string; dateOfBirth?: string; gender?: string; bloodGroup?: string } | null;
    wardId: { name: string; type: string } | null;
    bedId: { bedNumber: string } | null;
    admittedAt: string;
    status: string;
    diagnosis?: string;
  }[];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">IPD Admissions</h1>
          <p className="text-sm text-muted-foreground">{data?.meta?.pagination?.total ?? 0} admissions</p>
        </div>
        <div className="flex gap-2">
          <Link to="/ipd/wards"><Button variant="outline">Ward Map</Button></Link>
          <Link to="/ipd/new">
            <Button className="gap-2 bg-medical-blue hover:bg-medical-blue/90"><Plus className="h-4 w-4" />Admit Patient</Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name or UHID..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="discharged">Discharged</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : admissions.length === 0 ? (
        <div className="text-center py-16">
          <BedDouble className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium">No admissions found</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {admissions.map((adm) => (
              <Link key={adm._id} to={`/ipd/${adm._id}`}>
                <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-medical-teal shrink-0">
                      <BedDouble className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{adm.patientId ? `${adm.patientId.firstName} ${adm.patientId.lastName}` : 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">
                        {adm.patientId?.uhid}
                        {adm.patientId?.dateOfBirth ? ` · ${calculateAge(adm.patientId.dateOfBirth)} yr` : ''}
                        {adm.patientId?.gender ? ` · ${adm.patientId.gender}` : ''}
                      </p>
                      {adm.diagnosis && <p className="text-xs text-muted-foreground mt-0.5 truncate">{adm.diagnosis}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium">{adm.wardId?.name ?? '—'} · {adm.bedId?.bedNumber ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{new Date(adm.admittedAt).toLocaleDateString()}</p>
                      <Badge variant={adm.status === 'active' ? 'default' : 'secondary'} className="mt-1">{adm.status}</Badge>
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
