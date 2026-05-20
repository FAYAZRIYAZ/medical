import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FlaskConical, Plus, Search, X, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LAB_ORDER_STATUS } from '@hims/shared';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from 'sonner';

const statusVariant: Record<string, 'secondary' | 'warning' | 'default' | 'success' | 'destructive'> = {
  ordered: 'secondary',
  sample_collected: 'warning',
  result_entered: 'default',
  verified: 'success',
  rejected: 'destructive',
};

interface Patient { _id: string; firstName: string; lastName: string; uhid: string; phone: string; }
interface Doctor { _id: string; firstName: string; lastName: string; specialization: string; }
interface LabTest { _id: string; name: string; code: string; sampleType: string; price: number; }
interface SelectedTest { testId: string; testName: string; urgent: boolean; }

function NewLabOrderDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();

  // Patient search
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientDrop, setShowPatientDrop] = useState(false);
  const debouncedPatient = useDebounce(patientSearch, 300);

  // Test search
  const [testSearch, setTestSearch] = useState('');
  const [selectedTests, setSelectedTests] = useState<SelectedTest[]>([]);
  const debouncedTest = useDebounce(testSearch, 300);

  // Form state
  const [doctorId, setDoctorId] = useState('');
  const [priority, setPriority] = useState<'routine' | 'urgent' | 'stat'>('routine');
  const [clinicalHistory, setClinicalHistory] = useState('');

  const { data: patientResults } = useQuery({
    queryKey: ['patients', 'search', debouncedPatient],
    queryFn: async () => {
      const res = await api.get<{ data: Patient[] }>('/patients', { params: { q: debouncedPatient, limit: 8 } });
      return res.data.data;
    },
    enabled: debouncedPatient.length >= 1 && !selectedPatient,
  });

  const { data: doctors } = useQuery({
    queryKey: ['doctors', 'list'],
    queryFn: async () => {
      const res = await api.get<{ data: Doctor[] }>('/doctors');
      return res.data.data ?? [];
    },
  });

  const { data: testResults } = useQuery({
    queryKey: ['lab', 'tests', 'search', debouncedTest],
    queryFn: async () => {
      const res = await api.get<{ data: LabTest[] }>('/lab/tests', { params: { q: debouncedTest, limit: 10 } });
      return res.data.data ?? [];
    },
    enabled: debouncedTest.length >= 1,
  });

  const addTest = (test: LabTest) => {
    if (selectedTests.some((t) => t.testId === test._id)) return;
    setSelectedTests((prev) => [...prev, { testId: test._id, testName: test.name, urgent: false }]);
    setTestSearch('');
  };

  const removeTest = (testId: string) => setSelectedTests((prev) => prev.filter((t) => t.testId !== testId));

  const toggleUrgent = (testId: string) =>
    setSelectedTests((prev) => prev.map((t) => t.testId === testId ? { ...t, urgent: !t.urgent } : t));

  const create = useMutation({
    mutationFn: () => api.post('/lab/orders', {
      patientId: selectedPatient!._id,
      doctorId,
      priority,
      clinicalHistory: clinicalHistory || undefined,
      items: selectedTests,
    }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lab'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Lab order created successfully');
      onClose();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Failed to create lab order');
    },
  });

  const canSubmit = selectedPatient && doctorId && selectedTests.length > 0 && !create.isPending;

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-purple-600" />
          New Lab Order
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-5 mt-2">
        {/* Patient */}
        <div>
          <label className="text-sm font-medium mb-1.5 block">Patient *</label>
          {selectedPatient ? (
            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
              <div>
                <p className="text-sm font-medium">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                <p className="text-xs text-muted-foreground">{selectedPatient.uhid} · {selectedPatient.phone}</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => { setSelectedPatient(null); setPatientSearch(''); }}>
                Change
              </Button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search patient by name, UHID or phone..."
                value={patientSearch}
                onChange={(e) => { setPatientSearch(e.target.value); setShowPatientDrop(true); }}
                onFocus={() => setShowPatientDrop(true)}
                onBlur={() => setTimeout(() => setShowPatientDrop(false), 200)}
              />
              {showPatientDrop && debouncedPatient.length >= 1 && (
                <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg overflow-hidden">
                  {(patientResults ?? []).length === 0 ? (
                    <p className="px-4 py-3 text-sm text-muted-foreground">No patients found — try name, UHID or phone</p>
                  ) : (patientResults ?? []).map((p) => (
                    <button key={p._id} type="button"
                      className="w-full text-left px-4 py-2.5 hover:bg-muted/50 border-b last:border-b-0 transition-colors"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { setSelectedPatient(p); setShowPatientDrop(false); }}>
                      <p className="text-sm font-medium">{p.firstName} {p.lastName}</p>
                      <p className="text-xs text-muted-foreground">{p.uhid} · {p.phone}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Doctor */}
        <div>
          <label className="text-sm font-medium mb-1.5 block">Ordering Doctor *</label>
          <Select onValueChange={setDoctorId}>
            <SelectTrigger>
              <SelectValue placeholder="Select doctor" />
            </SelectTrigger>
            <SelectContent>
              {(doctors ?? []).map((d) => (
                <SelectItem key={d._id} value={d._id}>
                  Dr. {d.firstName} {d.lastName} — {d.specialization}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Priority */}
        <div>
          <label className="text-sm font-medium mb-1.5 block">Priority</label>
          <div className="flex gap-2">
            {(['routine', 'urgent', 'stat'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors capitalize ${
                  priority === p
                    ? p === 'stat' ? 'bg-red-600 text-white border-red-600'
                      : p === 'urgent' ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-medical-blue text-white border-medical-blue'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-muted/50'
                }`}
              >
                {p === 'stat' ? 'STAT' : p}
              </button>
            ))}
          </div>
        </div>

        {/* Test Selection */}
        <div>
          <label className="text-sm font-medium mb-1.5 block">Tests * <span className="text-muted-foreground font-normal">(at least 1)</span></label>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search tests by name or code..."
              value={testSearch}
              onChange={(e) => setTestSearch(e.target.value)}
            />
            {testSearch.length >= 1 && (testResults ?? []).length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg overflow-hidden">
                {(testResults ?? []).map((t) => {
                  const alreadyAdded = selectedTests.some((s) => s.testId === t._id);
                  return (
                    <button key={t._id} type="button"
                      disabled={alreadyAdded}
                      className={`w-full text-left px-4 py-2.5 border-b last:border-b-0 transition-colors ${alreadyAdded ? 'opacity-40 cursor-not-allowed bg-muted/30' : 'hover:bg-muted/50'}`}
                      onClick={() => addTest(t)}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{t.name}</p>
                          <p className="text-xs text-muted-foreground">{t.code} · {t.sampleType}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">₹{t.price}</p>
                          {alreadyAdded && <p className="text-xs text-green-600">Added</p>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {selectedTests.length === 0 ? (
            <div className="border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground">
              <FlaskConical className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No tests selected — search and add tests above</p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedTests.map((t) => (
                <div key={t.testId} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                  <div className="flex items-center gap-3">
                    <FlaskConical className="h-4 w-4 text-purple-500 shrink-0" />
                    <p className="text-sm font-medium">{t.testName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleUrgent(t.testId)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                        t.urgent ? 'bg-orange-100 text-orange-700 border border-orange-300' : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-orange-50'
                      }`}
                    >
                      <AlertCircle className="h-3 w-3" />
                      {t.urgent ? 'Urgent' : 'Routine'}
                    </button>
                    <button type="button" onClick={() => removeTest(t.testId)} className="text-red-400 hover:text-red-600 p-1 rounded transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Clinical History */}
        <div>
          <label className="text-sm font-medium mb-1.5 block">Clinical History / Notes</label>
          <Textarea
            placeholder="Relevant clinical history, symptoms, previous results..."
            rows={3}
            value={clinicalHistory}
            onChange={(e) => setClinicalHistory(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-1 border-t">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            type="button"
            disabled={!canSubmit}
            onClick={() => create.mutate()}
            className="bg-purple-600 hover:bg-purple-700 text-white min-w-[140px]"
          >
            {create.isPending ? 'Creating…' : `Create Order (${selectedTests.length} test${selectedTests.length !== 1 ? 's' : ''})`}
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

export function LabPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [newOrderOpen, setNewOrderOpen] = useState(false);
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
    status: string;
    priority: string;
    createdAt: string;
  }[];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laboratory</h1>
          <p className="text-sm text-muted-foreground">{data?.meta?.pagination?.total ?? 0} lab orders</p>
        </div>
        <Button onClick={() => setNewOrderOpen(true)} className="gap-2 bg-purple-600 hover:bg-purple-700 text-white">
          <Plus className="h-4 w-4" /> New Lab Order
        </Button>
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
              <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
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
          <p className="text-sm text-muted-foreground mt-1">Create a new lab order using the button above</p>
          <Button className="mt-4 gap-2 bg-purple-600 hover:bg-purple-700 text-white" onClick={() => setNewOrderOpen(true)}>
            <Plus className="h-4 w-4" /> New Lab Order
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {orders.map((order) => (
              <Link key={order._id} to={`/lab/${order._id}`}>
                <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full shrink-0 ${
                      order.priority === 'stat' ? 'bg-red-100 text-red-600' :
                      order.priority === 'urgent' ? 'bg-orange-100 text-orange-600' :
                      'bg-purple-50 text-purple-600'
                    }`}>
                      <FlaskConical className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">
                          {order.patientId ? `${order.patientId.firstName} ${order.patientId.lastName}` : 'Unknown'}
                        </p>
                        {order.priority && order.priority !== 'routine' && (
                          <Badge variant={order.priority === 'stat' ? 'destructive' : 'warning'} className="text-xs uppercase">
                            {order.priority}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{order.patientId?.uhid} · {order.items?.length ?? 0} test(s)</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {order.items?.slice(0, 3).map((i) => i.testId?.name ?? '').filter(Boolean).join(', ')}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</p>
                      <Badge variant={statusVariant[order.status] ?? 'secondary'} className="mt-1">
                        {order.status.replace(/_/g, ' ')}
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

      <Dialog open={newOrderOpen} onOpenChange={setNewOrderOpen}>
        {newOrderOpen && <NewLabOrderDialog onClose={() => setNewOrderOpen(false)} />}
      </Dialog>
    </div>
  );
}
