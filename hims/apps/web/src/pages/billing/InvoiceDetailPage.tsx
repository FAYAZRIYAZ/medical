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

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['billing', 'invoice', id],
    queryFn: async () => {
      const res = await api.get<{ data: unknown }>(`/billing/invoices/${id}`);
      return res.data.data;
    },
  });

  const recordPayment = useMutation({
    mutationFn: () => api.post(`/billing/invoices/${id}/payments`, { amount: Number(amount), method }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['billing', 'invoice', id] });
      setAmount('');
      toast.success('Payment recorded');
    },
  });

  if (isLoading) return <div className="p-6 space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-64" /></div>;

  const inv = invoice as {
    _id: string; invoiceNo: string; status: string; createdAt: string;
    patientId: { name: string; uhid: string; phone: string };
    items: { description: string; quantity: number; unitPrice: number; total: number; gstAmount: number }[];
    subtotal: number; gstTotal: number; totalAmount: number; paidAmount: number; dueAmount: number;
    payments: { amount: number; method: string; paidAt: string }[];
  };

  const statusVariant: Record<string, 'secondary' | 'warning' | 'success' | 'destructive'> = {
    draft: 'secondary', pending: 'warning', partial: 'warning', paid: 'success', cancelled: 'destructive',
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/billing" className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{inv?.invoiceNo}</h1>
            <Badge variant={statusVariant[inv?.status ?? ''] ?? 'secondary'}>{inv?.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{inv?.patientId?.name} · {inv?.patientId?.uhid}</p>
        </div>
        <Button variant="outline" className="gap-2"><Download className="h-4 w-4" />PDF</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total</p><p className="text-xl font-bold">{formatCurrency(inv?.totalAmount ?? 0)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Paid</p><p className="text-xl font-bold text-green-600">{formatCurrency(inv?.paidAmount ?? 0)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Due</p><p className="text-xl font-bold text-red-600">{formatCurrency(inv?.dueAmount ?? 0)}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Line Items</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground pb-2 border-b">
              <span className="col-span-5">Description</span>
              <span className="col-span-2 text-right">Qty</span>
              <span className="col-span-2 text-right">Unit Price</span>
              <span className="col-span-3 text-right">Total</span>
            </div>
            {(inv?.items ?? []).map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 text-sm py-1">
                <span className="col-span-5">{item.description}</span>
                <span className="col-span-2 text-right">{item.quantity}</span>
                <span className="col-span-2 text-right">{formatCurrency(item.unitPrice)}</span>
                <span className="col-span-3 text-right">{formatCurrency(item.total)}</span>
              </div>
            ))}
            <div className="border-t pt-2 space-y-1">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(inv?.subtotal ?? 0)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">GST</span><span>{formatCurrency(inv?.gstTotal ?? 0)}</span></div>
              <div className="flex justify-between font-bold"><span>Total</span><span>{formatCurrency(inv?.totalAmount ?? 0)}</span></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {(inv?.dueAmount ?? 0) > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Record Payment</CardTitle></CardHeader>
          <CardContent className="flex gap-3">
            <Input type="number" placeholder={`Due: ${formatCurrency(inv?.dueAmount ?? 0)}`} value={amount} onChange={(e) => setAmount(e.target.value)} className="w-40" />
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.values(PAYMENT_METHOD).map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={() => recordPayment.mutate()} loading={recordPayment.isPending} className="gap-2">
              <CreditCard className="h-4 w-4" />Record
            </Button>
          </CardContent>
        </Card>
      )}

      {(inv?.payments ?? []).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Payment History</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(inv?.payments ?? []).map((p, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">{formatCurrency(p.amount)}</p>
                    <p className="text-xs text-muted-foreground">{p.method} · {new Date(p.paidAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
