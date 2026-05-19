import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useState } from 'react';

const STATUS_STEPS = ['ordered', 'sample_collected', 'result_entered', 'verified'];

interface OrderItem {
  testId: string;
  testName: string;
  barcodeId?: string;
  status: string;
}

interface LabOrder {
  _id: string;
  status: string;
  priority: string;
  createdAt: string;
  reportPdfUrl?: string;
  patientId: { _id: string; firstName: string; lastName: string; uhid: string };
  doctorId: { firstName: string; lastName: string; specialization?: string };
  items: OrderItem[];
}

interface LabResult {
  _id: string;
  isVerified: boolean;
}

export function LabOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});

  const { data: order, isLoading } = useQuery({
    queryKey: ['lab', 'order', id],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: LabOrder }>(`/lab/orders/${id}`);
      return res.data.data;
    },
  });

  const { data: resultsData } = useQuery({
    queryKey: ['lab', 'results', id],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: LabResult[] }>('/lab/results', {
        params: { orderId: id },
      });
      return res.data.data;
    },
    enabled: Boolean(id) && ['result_entered', 'verified'].includes(order?.status ?? ''),
  });

  const collectSample = useMutation({
    mutationFn: () => api.patch(`/lab/orders/${id}/collect-sample`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lab', 'order', id] });
      toast.success('Sample collected');
    },
    onError: () => toast.error('Failed to mark sample collected'),
  });

  const submitResults = useMutation({
    mutationFn: (payload: {
      orderId: string;
      results: { testId: string; parameter: string; value: string; unit: string; abnormal: boolean; critical: boolean }[];
    }) => api.post('/lab/results', payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lab', 'order', id] });
      void qc.invalidateQueries({ queryKey: ['lab', 'results', id] });
      toast.success('Results submitted');
    },
    onError: () => toast.error('Failed to submit results'),
  });

  const verifyResults = useMutation({
    mutationFn: (resultId: string) => api.post(`/lab/results/${resultId}/verify`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lab', 'order', id] });
      toast.success('Results verified and report generated');
    },
    onError: () => toast.error('Failed to verify results'),
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Lab order not found</p>
        <Link to="/lab" className="text-medical-blue text-sm mt-2 inline-block">Back to Lab</Link>
      </div>
    );
  }

  const stepIndex = STATUS_STEPS.indexOf(order.status);
  const patientName = `${order.patientId.firstName} ${order.patientId.lastName}`;
  const doctorName = `Dr. ${order.doctorId.firstName} ${order.doctorId.lastName}`;
  const firstResult = resultsData?.[0];

  const handleSubmitResults = () => {
    const results = order.items
      .filter((item) => values[item.testId])
      .map((item) => ({
        testId: item.testId,
        parameter: item.testName,
        value: values[item.testId] ?? '',
        unit: '',
        abnormal: false,
        critical: false,
      }));

    if (results.length === 0) {
      toast.error('Enter at least one result value');
      return;
    }
    submitResults.mutate({ orderId: id!, results });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/lab" className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Lab Order</h1>
          <p className="text-sm text-muted-foreground">{patientName} · {order.patientId.uhid}</p>
        </div>
        {order.reportPdfUrl && (
          <a href={order.reportPdfUrl} target="_blank" rel="noreferrer">
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" /> Download Report
            </Button>
          </a>
        )}
      </div>

      {/* Status stepper */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center">
            {STATUS_STEPS.map((step, i) => (
              <div key={step} className="flex items-center flex-1">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold shrink-0 ${i <= stepIndex ? 'bg-medical-blue text-white' : 'bg-muted text-muted-foreground'}`}>
                  {i + 1}
                </div>
                <div className="flex-1 ml-1 hidden sm:block">
                  <p className={`text-xs ${i <= stepIndex ? 'text-medical-blue font-medium' : 'text-muted-foreground'}`}>
                    {step.replace(/_/g, ' ')}
                  </p>
                </div>
                {i < STATUS_STEPS.length - 1 && (
                  <div className={`h-0.5 w-4 mx-1 ${i < stepIndex ? 'bg-medical-blue' : 'bg-border'}`} />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Info cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Ordered By</p>
            <p className="font-semibold truncate">{doctorName}</p>
            {order.doctorId.specialization && (
              <p className="text-xs text-muted-foreground">{order.doctorId.specialization}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Date</p>
            <p className="font-semibold">{new Date(order.createdAt).toLocaleDateString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Tests</p>
            <p className="font-semibold">{order.items.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Priority</p>
            <Badge variant={order.priority === 'urgent' || order.priority === 'stat' ? 'destructive' : 'secondary'} className="mt-1">
              {order.priority}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Test items + result entry */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Test Results</CardTitle>
          <div className="flex gap-2">
            {order.status === 'ordered' && (
              <Button
                size="sm"
                onClick={() => collectSample.mutate()}
                disabled={collectSample.isPending}
              >
                {collectSample.isPending ? 'Updating...' : 'Mark Sample Collected'}
              </Button>
            )}
            {order.status === 'result_entered' && firstResult && (
              <Button
                size="sm"
                onClick={() => verifyResults.mutate(firstResult._id)}
                disabled={verifyResults.isPending}
              >
                {verifyResults.isPending ? 'Verifying...' : 'Verify Results'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-4 p-3 rounded-lg border">
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.testName}</p>
                  {item.barcodeId && (
                    <p className="text-xs text-muted-foreground">Barcode: {item.barcodeId}</p>
                  )}
                </div>
                {order.status === 'sample_collected' ? (
                  <div className="flex items-center gap-2">
                    <Input
                      className="w-32 h-8 text-sm"
                      placeholder="Enter value"
                      value={values[item.testId] ?? ''}
                      onChange={(e) => setValues((v) => ({ ...v, [item.testId]: e.target.value }))}
                    />
                  </div>
                ) : (
                  <Badge variant={['result_entered', 'verified'].includes(item.status) ? 'default' : 'secondary'}>
                    {item.status.replace(/_/g, ' ')}
                  </Badge>
                )}
              </div>
            ))}
          </div>

          {order.status === 'sample_collected' && (
            <Button
              className="mt-4 w-full"
              disabled={submitResults.isPending}
              onClick={handleSubmitResults}
            >
              {submitResults.isPending ? 'Submitting...' : 'Submit Results'}
            </Button>
          )}

          {order.status === 'verified' && (
            <div className="mt-4 flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
              <span className="text-sm font-medium">Results verified and report generated</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
