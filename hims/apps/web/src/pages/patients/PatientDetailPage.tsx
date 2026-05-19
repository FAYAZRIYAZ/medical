import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, FileText, FlaskConical, DollarSign, Pencil } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { usePatient, useUpdatePatient } from '@/hooks/usePatients';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { initials, calculateAge, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

interface PatientEditForm {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  gender: string;
  bloodGroup: string;
  'address.line1': string;
  'address.city': string;
  'address.state': string;
  'address.pincode': string;
}

export function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: patient, isLoading } = usePatient(id!);
  const [editOpen, setEditOpen] = useState(false);
  const update = useUpdatePatient(id!);

  const p = patient as {
    _id: string; firstName: string; lastName: string; uhid: string; dateOfBirth: string; gender: string; bloodGroup: string;
    phone: string; email?: string; photoUrl?: string;
    address?: { line1?: string; city?: string; state?: string; pincode?: string };
    emergencyContacts?: { name: string; relationship: string; phone: string }[];
    appointments?: { _id: string; date: string; doctorName: string; status: string }[];
    prescriptions?: { _id: string; date: string; doctorName: string; medications: number }[];
    labOrders?: { _id: string; testName: string; date: string; status: string }[];
    invoices?: { _id: string; invoiceNo: string; total: number; status: string; date: string }[];
  } | undefined;

  const { register, handleSubmit, setValue, reset } = useForm<PatientEditForm>();

  const openEdit = () => {
    if (!p) return;
    reset({
      firstName: p.firstName,
      lastName: p.lastName,
      phone: p.phone,
      email: p.email ?? '',
      gender: p.gender,
      bloodGroup: p.bloodGroup ?? '',
      'address.line1': p.address?.line1 ?? '',
      'address.city': p.address?.city ?? '',
      'address.state': p.address?.state ?? '',
      'address.pincode': p.address?.pincode ?? '',
    });
    setEditOpen(true);
  };

  const onSubmit = (data: PatientEditForm) => {
    const payload = {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      email: data.email || undefined,
      gender: data.gender as 'male' | 'female' | 'other' | 'prefer_not_to_say',
      bloodGroup: data.bloodGroup || undefined,
      address: {
        line1: data['address.line1'],
        city: data['address.city'],
        state: data['address.state'],
        pincode: data['address.pincode'],
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    update.mutate(payload as any, {
      onSuccess: () => { toast.success('Patient updated'); setEditOpen(false); },
      onError: () => toast.error('Failed to update patient'),
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!p) {
    return (
      <div className="p-6 text-center py-16">
        <p className="text-lg font-medium">Patient not found</p>
        <Link to="/patients"><Button className="mt-4" variant="outline">Back to Patients</Button></Link>
      </div>
    );
  }

  const firstContact = p.emergencyContacts?.[0];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/patients" className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{p.firstName} {p.lastName}</h1>
          <p className="text-sm text-muted-foreground">{p.uhid}</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={openEdit}>
          <Pencil className="h-4 w-4" /> Edit Patient
        </Button>
        <Link to={`/appointments/new?patientId=${p._id}`}>
          <Button className="gap-2 bg-medical-blue hover:bg-medical-blue/90">
            <Calendar className="h-4 w-4" /> Book Appointment
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <Avatar className="h-20 w-20 shrink-0">
              {p.photoUrl && <AvatarImage src={p.photoUrl} />}
              <AvatarFallback className="bg-medical-blue text-white text-xl">{initials(`${p.firstName} ${p.lastName}`)}</AvatarFallback>
            </Avatar>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
              <div>
                <p className="text-xs text-muted-foreground">Age / Gender</p>
                <p className="text-sm font-medium">{calculateAge(p.dateOfBirth)} yr · {p.gender}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Blood Group</p>
                <p className="text-sm font-medium">{p.bloodGroup || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="text-sm font-medium">{p.phone}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium truncate">{p.email || '—'}</p>
              </div>
              {p.address?.city && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Address</p>
                  <p className="text-sm font-medium">{[p.address.line1, p.address.city, p.address.state, p.address.pincode].filter(Boolean).join(', ')}</p>
                </div>
              )}
              {firstContact && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Emergency Contact</p>
                  <p className="text-sm font-medium">{firstContact.name} ({firstContact.relationship}) — {firstContact.phone}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="appointments">
        <TabsList>
          <TabsTrigger value="appointments" className="gap-1.5"><Calendar className="h-3.5 w-3.5" />Appointments</TabsTrigger>
          <TabsTrigger value="prescriptions" className="gap-1.5"><FileText className="h-3.5 w-3.5" />Prescriptions</TabsTrigger>
          <TabsTrigger value="lab" className="gap-1.5"><FlaskConical className="h-3.5 w-3.5" />Lab</TabsTrigger>
          <TabsTrigger value="billing" className="gap-1.5"><DollarSign className="h-3.5 w-3.5" />Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Appointment History</CardTitle>
              <Link to={`/appointments/new?patientId=${p._id}`}><Button size="sm" variant="outline">+ Book</Button></Link>
            </CardHeader>
            <CardContent>
              {(p.appointments ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No appointments found</p>
              ) : (
                <div className="space-y-2">
                  {(p.appointments ?? []).map((apt) => (
                    <div key={apt._id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="text-sm font-medium">{apt.doctorName}</p>
                        <p className="text-xs text-muted-foreground">{new Date(apt.date).toLocaleDateString()}</p>
                      </div>
                      <Badge variant={apt.status === 'completed' ? 'default' : 'secondary'}>{apt.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prescriptions">
          <Card>
            <CardHeader><CardTitle className="text-base">Prescriptions</CardTitle></CardHeader>
            <CardContent>
              {(p.prescriptions ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No prescriptions found</p>
              ) : (
                <div className="space-y-2">
                  {(p.prescriptions ?? []).map((rx) => (
                    <div key={rx._id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="text-sm font-medium">{rx.doctorName}</p>
                        <p className="text-xs text-muted-foreground">{new Date(rx.date).toLocaleDateString()} · {rx.medications} medications</p>
                      </div>
                      <Button size="sm" variant="outline"><FileText className="h-3.5 w-3.5 mr-1" />PDF</Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lab">
          <Card>
            <CardHeader><CardTitle className="text-base">Lab Orders</CardTitle></CardHeader>
            <CardContent>
              {(p.labOrders ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No lab orders found</p>
              ) : (
                <div className="space-y-2">
                  {(p.labOrders ?? []).map((o) => (
                    <Link key={o._id} to={`/lab/${o._id}`}>
                      <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div>
                          <p className="text-sm font-medium">{o.testName}</p>
                          <p className="text-xs text-muted-foreground">{new Date(o.date).toLocaleDateString()}</p>
                        </div>
                        <Badge variant={o.status === 'verified' ? 'default' : 'secondary'}>{o.status}</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Invoices</CardTitle>
              <Link to={`/billing/new?patientId=${p._id}`}><Button size="sm" variant="outline">+ Invoice</Button></Link>
            </CardHeader>
            <CardContent>
              {(p.invoices ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No invoices found</p>
              ) : (
                <div className="space-y-2">
                  {(p.invoices ?? []).map((inv) => (
                    <Link key={inv._id} to={`/billing/${inv._id}`}>
                      <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div>
                          <p className="text-sm font-medium">{inv.invoiceNo}</p>
                          <p className="text-xs text-muted-foreground">{new Date(inv.date).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{formatCurrency(inv.total)}</p>
                          <Badge variant={inv.status === 'paid' ? 'default' : inv.status === 'partial' ? 'secondary' : 'destructive'}>{inv.status}</Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Patient Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Patient</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">First Name</label>
                <Input {...register('firstName', { required: true })} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Last Name</label>
                <Input {...register('lastName', { required: true })} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Phone</label>
              <Input {...register('phone', { required: true })} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Email</label>
              <Input {...register('email')} type="email" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Gender</label>
                <Select defaultValue={p.gender} onValueChange={(v) => setValue('gender', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Blood Group</label>
                <Select defaultValue={p.bloodGroup ?? ''} onValueChange={(v) => setValue('bloodGroup', v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                      <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Address Line 1</label>
              <Input {...register('address.line1')} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">City</label>
                <Input {...register('address.city')} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">State</label>
                <Input {...register('address.state')} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Pincode</label>
                <Input {...register('address.pincode')} />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={update.isPending} className="bg-medical-blue hover:bg-medical-blue/90">
                {update.isPending ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
