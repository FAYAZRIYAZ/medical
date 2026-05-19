import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { CreateInvoiceSchema, type CreateInvoiceInput } from '@hims/shared';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

const EMPTY_ITEM = (): CreateInvoiceInput['items'][number] => ({
  serviceId: '',
  serviceName: '',
  category: 'consultation',
  quantity: 1,
  unitPrice: 0,
  discount: 0,
  gstRate: 0,
});

export function NewInvoicePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const patientId = params.get('patientId') ?? '';

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<CreateInvoiceInput>({
    resolver: zodResolver(CreateInvoiceSchema),
    defaultValues: {
      patientId,
      items: [EMPTY_ITEM()],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const items = watch('items');

  const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0);
  const gst = items.reduce((sum, item) => {
    const lineTotal = Number(item.quantity) * Number(item.unitPrice);
    return sum + lineTotal * (Number(item.gstRate ?? 0) / 100);
  }, 0);
  const total = subtotal + gst;

  const create = useMutation({
    mutationFn: (data: CreateInvoiceInput) => api.post('/billing/invoices', data),
    onSuccess: (res) => {
      toast.success('Invoice created');
      navigate(`/billing/${(res.data as { data: { _id: string } }).data._id}`);
    },
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Invoice</h1>
          <p className="text-sm text-muted-foreground">Create a billing invoice</p>
        </div>
      </div>

      <form onSubmit={handleSubmit((d) => create.mutate(d))} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Patient</CardTitle></CardHeader>
          <CardContent>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Patient ID *</label>
              <Input {...register('patientId')} placeholder="Patient UHID or ID" />
              {errors.patientId && <p className="mt-1 text-xs text-red-600">{errors.patientId.message}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Invoice Items</CardTitle>
            <Button type="button" size="sm" variant="outline" onClick={() => append(EMPTY_ITEM())}>
              <Plus className="h-3.5 w-3.5 mr-1" />Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground font-medium px-1">
              <span className="col-span-2">Code</span>
              <span className="col-span-4">Service Name</span>
              <span className="col-span-2">Qty</span>
              <span className="col-span-2">Unit Price</span>
              <span className="col-span-1">Total</span>
              <span className="col-span-1" />
            </div>
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-2">
                  <Input {...register(`items.${index}.serviceId`)} placeholder="SVC-001" />
                </div>
                <div className="col-span-4">
                  <Input {...register(`items.${index}.serviceName`)} placeholder="Consultation" />
                </div>
                <div className="col-span-2">
                  <Input type="number" min={1} {...register(`items.${index}.quantity`, { valueAsNumber: true })} placeholder="Qty" />
                </div>
                <div className="col-span-2">
                  <Input type="number" min={0} step={0.01} {...register(`items.${index}.unitPrice`, { valueAsNumber: true })} placeholder="Price" />
                </div>
                <div className="col-span-1 flex items-center pt-2.5">
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(Number(items[index]?.quantity ?? 0) * Number(items[index]?.unitPrice ?? 0))}
                  </p>
                </div>
                <div className="col-span-1 flex items-center pt-1.5">
                  {fields.length > 1 && (
                    <button type="button" onClick={() => remove(index)} className="text-red-400 hover:text-red-600 p-1">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">GST</span><span>{formatCurrency(gst)}</span></div>
            <div className="flex justify-between font-bold text-base border-t pt-2"><span>Total</span><span>{formatCurrency(total)}</span></div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" loading={create.isPending} className="bg-medical-blue hover:bg-medical-blue/90">Create Invoice</Button>
        </div>
      </form>
    </div>
  );
}
