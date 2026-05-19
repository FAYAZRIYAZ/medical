import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, CreditCard } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { PAYMENT_METHOD } from '@hims/shared';

interface InvoiceItem {
  serviceId?: string;
  serviceName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  gstRate: number;
  subtotal: number;
  gstAmount: number;
  total: number;
}

interface Invoice {
  _id: string;
  invoiceNumber: string;
  status: string;
  createdAt: string;
  patientId: { firstName: string; lastName: string; uhid: string; phone?: string } | null;
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
}

const statusVariant: Record<string, 'secondary' | 'warning' | 'success' | 'destructive'> = {
  draft: 'secondary',
  issued: 'warning',
  partial: 'warning',
  overdue: 'destructive',
  paid: 'success',
  cancelled: 'destructive',
  refunded: 'secondary',
};

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['billing', 'invoice', id],
    queryFn: async () => {
      const res = await api.get<{ data: Invoice }>(`/billing/invoices/${id}`);
      return res.data.data;
    },
  });

  const recordPayment = useMutation({
    mutationFn: () =>
      api.post('/billing/payments', {
        invoiceId: id,
        amount: Number(amount),
        method,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['billing', 'invoice', id] });
      void qc.invalidateQueries({ queryKey: ['billing', 'invoices'] });
      setAmount('');
      toast.success('Payment recorded successfully');
    },
    onError: () => toast.error('Failed to record payment'),
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const inv = invoice;
  const patientName = inv?.patientId
    ? `${inv.patientId.firstName} ${inv.patientId.lastName}`
    : 'Unknown Patient';

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/billing" className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{inv?.invoiceNumber ?? '—'}</h1>
            <Badge variant={statusVariant[inv?.status ?? ''] ?? 'secondary'}>
              {inv?.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {patientName}
            {inv?.patientId?.uhid ? ` · ${inv.patientId.uhid}` : ''}
            {inv?.patientId?.phone ? ` · ${inv.patientId.phone}` : ''}
          </p>
          <p className="text-xs text-muted-foreground">
            Created {inv?.createdAt ? new Date(inv.createdAt).toLocaleString() : ''}
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => toast.info('PDF export coming soon')}>
          <Download className="h-4 w-4" />PDF
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(inv?.totalAmount ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Amount Paid</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(inv?.paidAmount ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Amount Due</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(inv?.dueAmount ?? 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Line items */}
      <Card>
        <CardHeader><CardTitle className="text-base">Invoice Items</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground pb-2 border-b">
              <span className="col-span-5">Service</span>
              <span className="col-span-1 text-center">Qty</span>
              <span className="col-span-2 text-right">Unit Price</span>
              <span className="col-span-2 text-right">GST</span>
              <span className="col-span-2 text-right">Total</span>
            </div>
            {(inv?.items ?? []).map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 text-sm py-2 border-b last:border-0">
                <div className="col-span-5">
                  <p className="font-medium">{item.serviceName}</p>
                  <p className="text-xs text-muted-foreground capitalize">{item.category.replace(/_/g, ' ')}</p>
                </div>
                <span className="col-span-1 text-center">{item.quantity}</span>
                <span className="col-span-2 text-right">{formatCurrency(item.unitPrice)}</span>
                <span className="col-span-2 text-right text-muted-foreground">
                  {formatCurrency(item.gstAmount ?? 0)}
                </span>
                <span className="col-span-2 text-right font-medium">{formatCurrency(item.total ?? 0)}</span>
              </div>
            ))}
            <div className="pt-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(inv?.subtotal ?? 0)}</span>
              </div>
              {(inv?.discountAmount ?? 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="text-red-600">-{formatCurrency(inv?.discountAmount ?? 0)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">GST</span>
                <span>{formatCurrency(inv?.taxAmount ?? 0)}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t pt-2">
                <span>Total</span>
                <span>{formatCurrency(inv?.totalAmount ?? 0)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Record payment */}
      {(inv?.dueAmount ?? 0) > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Record Payment</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-40">
                <label className="text-xs text-muted-foreground mb-1 block">Amount</label>
                <Input
                  type="number"
                  min={0.01}
                  step={0.01}
                  max={inv?.dueAmount}
                  placeholder={`Max: ${formatCurrency(inv?.dueAmount ?? 0)}`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="w-40">
                <label className="text-xs text-muted-foreground mb-1 block">Method</label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.values(PAYMENT_METHOD).map((m) => (
                      <SelectItem key={m} value={m} className="capitalize">{m.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => {
                  if (!amount || Number(amount) <= 0) { toast.error('Enter a valid amount'); return; }
                  recordPayment.mutate();
                }}
                loading={recordPayment.isPending}
                className="gap-2 bg-medical-blue hover:bg-medical-blue/90"
              >
                <CreditCard className="h-4 w-4" />Record Payment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
