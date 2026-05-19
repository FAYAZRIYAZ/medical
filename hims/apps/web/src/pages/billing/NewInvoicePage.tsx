import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Search } from 'lucide-react';
import { CreateInvoiceSchema, type CreateInvoiceInput } from '@hims/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';

interface Patient { _id: string; firstName: string; lastName: string; uhid: string; phone: string; }

const CATEGORIES = [
  'consultation', 'procedure', 'lab', 'pharmacy',
  'room_rent', 'surgery', 'radiology', 'nursing', 'other',
] as const;

const EMPTY_ITEM = (): CreateInvoiceInput['items'][number] => ({
  serviceName: '',
  category: 'consultation',
  quantity: 1,
  unitPrice: 0,
  discount: 0,
  gstRate: 0,
});

export function NewInvoicePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const debouncedSearch = useDebounce(patientSearch, 300);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateInvoiceInput>({
    resolver: zodResolver(CreateInvoiceSchema),
    defaultValues: {
      patientId: params.get('patientId') ?? '',
      items: [EMPTY_ITEM()],
    },
  });

  // Pre-fill patient if passed via URL
  const prefilledId = params.get('patientId');
  useQuery({
    queryKey: ['patients', 'detail', prefilledId],
    queryFn: async () => {
      const res = await api.get<{ data: Patient }>(`/patients/${prefilledId}`);
      const p = res.data.data;
      setSelectedPatient(p);
      setValue('patientId', p._id);
      return p;
    },
    enabled: !!prefilledId && !selectedPatient,
  });

  const { data: patientResults } = useQuery({
    queryKey: ['patients', 'search', debouncedSearch],
    queryFn: async () => {
      const res = await api.get<{ data: Patient[] }>('/patients', { params: { q: debouncedSearch, limit: 8 } });
      return res.data.data;
    },
    enabled: debouncedSearch.length >= 2 && !selectedPatient,
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const items = watch('items');

  const subtotal = items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitPrice), 0);
  const gst = items.reduce((sum, item) => {
    const lineTotal = Number(item.quantity) * Number(item.unitPrice);
    return sum + lineTotal * (Number(item.gstRate ?? 0) / 100);
  }, 0);
  const discount = items.reduce((sum, item) => {
    const lineTotal = Number(item.quantity) * Number(item.unitPrice);
    return sum + lineTotal * (Number(item.discount ?? 0) / 100);
  }, 0);
  const total = subtotal - discount + gst;

  const create = useMutation({
    mutationFn: (data: CreateInvoiceInput) => api.post('/billing/invoices', data),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      void qc.invalidateQueries({ queryKey: ['billing'] });
      toast.success('Invoice created successfully');
      navigate(`/billing/${(res.data as { data: { _id: string } }).data._id}`);
    },
    onError: () => {
      toast.error('Failed to create invoice. Please check all fields.');
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
        {/* Patient */}
        <Card>
          <CardHeader><CardTitle className="text-base">Patient</CardTitle></CardHeader>
          <CardContent>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Patient *</label>
              {selectedPatient ? (
                <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                  <div>
                    <p className="text-sm font-medium">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                    <p className="text-xs text-muted-foreground">{selectedPatient.uhid} · {selectedPatient.phone}</p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => {
                    setSelectedPatient(null);
                    setValue('patientId', '');
                    setPatientSearch('');
                  }}>Change</Button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Search patient by name, UHID or phone..."
                    value={patientSearch}
                    onChange={(e) => { setPatientSearch(e.target.value); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                  />
                  {showDropdown && (patientResults ?? []).length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg overflow-hidden">
                      {(patientResults ?? []).map((p) => (
                        <button key={p._id} type="button"
                          className="w-full text-left px-4 py-2.5 hover:bg-muted/50 border-b last:border-b-0 transition-colors"
                          onClick={() => {
                            setSelectedPatient(p);
                            setValue('patientId', p._id);
                            setShowDropdown(false);
                          }}>
                          <p className="text-sm font-medium">{p.firstName} {p.lastName}</p>
                          <p className="text-xs text-muted-foreground">{p.uhid} · {p.phone}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {errors.patientId && <p className="mt-1 text-xs text-red-600">{errors.patientId.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Invoice Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Invoice Items</CardTitle>
            <Button type="button" size="sm" variant="outline" onClick={() => append(EMPTY_ITEM())}>
              <Plus className="h-3.5 w-3.5 mr-1" />Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Header row */}
            <div className="hidden md:grid grid-cols-12 gap-2 text-xs text-muted-foreground font-medium px-1">
              <span className="col-span-3">Service Name *</span>
              <span className="col-span-2">Category</span>
              <span className="col-span-1">Qty</span>
              <span className="col-span-2">Unit Price</span>
              <span className="col-span-1">Disc %</span>
              <span className="col-span-1">GST %</span>
              <span className="col-span-1">Total</span>
              <span className="col-span-1" />
            </div>

            {fields.map((field, index) => {
              const itemErrors = errors.items?.[index];
              return (
                <div key={field.id} className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 items-start">
                    {/* Service Name */}
                    <div className="col-span-12 md:col-span-3">
                      <Input
                        {...register(`items.${index}.serviceName`)}
                        placeholder="Service name"
                        className={itemErrors?.serviceName ? 'border-red-500' : ''}
                      />
                      {itemErrors?.serviceName && (
                        <p className="mt-0.5 text-xs text-red-600">{itemErrors.serviceName.message}</p>
                      )}
                    </div>

                    {/* Category */}
                    <div className="col-span-6 md:col-span-2">
                      <Select
                        defaultValue="consultation"
                        onValueChange={(v) => setValue(`items.${index}.category`, v as CreateInvoiceInput['items'][number]['category'])}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c} className="text-sm capitalize">
                              {c.replace(/_/g, ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Quantity */}
                    <div className="col-span-3 md:col-span-1">
                      <Input
                        type="number"
                        min={1}
                        {...register(`items.${index}.quantity`, { setValueAs: (v: string) => { const n = parseInt(v, 10); return isNaN(n) || n < 1 ? 1 : n; } })}
                        placeholder="Qty"
                        className={`text-center ${itemErrors?.quantity ? 'border-red-500' : ''}`}
                      />
                    </div>

                    {/* Unit Price */}
                    <div className="col-span-3 md:col-span-2">
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        {...register(`items.${index}.unitPrice`, { setValueAs: (v: string) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; } })}
                        placeholder="0.00"
                        className={itemErrors?.unitPrice ? 'border-red-500' : ''}
                      />
                      {itemErrors?.unitPrice && (
                        <p className="mt-0.5 text-xs text-red-600">{itemErrors.unitPrice.message}</p>
                      )}
                    </div>

                    {/* Discount */}
                    <div className="col-span-3 md:col-span-1">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        {...register(`items.${index}.discount`, { setValueAs: (v: string) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; } })}
                        placeholder="0"
                      />
                    </div>

                    {/* GST */}
                    <div className="col-span-3 md:col-span-1">
                      <Input
                        type="number"
                        min={0}
                        max={28}
                        step={0.5}
                        {...register(`items.${index}.gstRate`, { setValueAs: (v: string) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; } })}
                        placeholder="0"
                      />
                    </div>

                    {/* Line Total */}
                    <div className="col-span-2 md:col-span-1 flex items-center pt-2">
                      <p className="text-xs font-medium text-gray-700">
                        {formatCurrency(Number(items[index]?.quantity ?? 0) * Number(items[index]?.unitPrice ?? 0))}
                      </p>
                    </div>

                    {/* Remove */}
                    <div className="col-span-1 flex items-center pt-1">
                      {fields.length > 1 && (
                        <button type="button" onClick={() => remove(index)} className="text-red-400 hover:text-red-600 p-1 rounded">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {errors.items && !Array.isArray(errors.items) && (
              <p className="text-xs text-red-600">{(errors.items as { message?: string }).message}</p>
            )}
          </CardContent>
        </Card>

        {/* Notes (optional) */}
        <Card>
          <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Discount</span>
              <span className="text-red-600">-{formatCurrency(discount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">GST</span>
              <span>{formatCurrency(gst)}</span>
            </div>
            <div className="flex justify-between font-bold text-base border-t pt-2">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          <Button
            type="submit"
            disabled={create.isPending}
            className="bg-medical-blue hover:bg-medical-blue/90 min-w-[130px]"
          >
            {create.isPending ? 'Creating…' : 'Create Invoice'}
          </Button>
        </div>
      </form>
    </div>
  );
}
