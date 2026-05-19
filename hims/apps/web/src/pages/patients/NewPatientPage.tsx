import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { CreatePatientSchema, type CreatePatientInput, BLOOD_GROUP, GENDER } from '@hims/shared';
import { useCreatePatient } from '@/hooks/usePatients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function NewPatientPage() {
  const navigate = useNavigate();
  const { mutate, isPending } = useCreatePatient();

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<CreatePatientInput>({
    resolver: zodResolver(CreatePatientSchema),
  });

  const onSubmit = (data: CreatePatientInput) => {
    mutate(data, {
      onSuccess: (res) => {
        const id = (res.data as { data?: { _id?: string } } | undefined)?.data?._id;
        navigate(id ? `/patients/${id}` : '/patients');
      },
    });
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Register New Patient</h1>
          <p className="text-sm text-muted-foreground">Fill in the patient details below</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">First Name *</label>
              <Input {...register('firstName')} placeholder="John" />
              {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Last Name *</label>
              <Input {...register('lastName')} placeholder="Doe" />
              {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Date of Birth *</label>
              <Input type="date" {...register('dateOfBirth')} />
              {errors.dateOfBirth && <p className="mt-1 text-xs text-red-600">{errors.dateOfBirth.message}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Gender *</label>
              <Select onValueChange={(v) => setValue('gender', v as CreatePatientInput['gender'])}>
                <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  {GENDER.map((g) => (
                    <SelectItem key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1).replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.gender && <p className="mt-1 text-xs text-red-600">{errors.gender.message}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Blood Group</label>
              <Select onValueChange={(v) => setValue('bloodGroup', v as CreatePatientInput['bloodGroup'])}>
                <SelectTrigger><SelectValue placeholder="Select blood group" /></SelectTrigger>
                <SelectContent>
                  {BLOOD_GROUP.map((bg) => (
                    <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Phone *</label>
              <Input {...register('phone')} placeholder="+91 9876543210" />
              {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium">Email</label>
              <Input type="email" {...register('email')} placeholder="patient@email.com" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Address</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium">Address Line 1</label>
              <Input {...register('address.line1')} placeholder="123 Main St" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium">Address Line 2</label>
              <Input {...register('address.line2')} placeholder="Apt 4B" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">City</label>
              <Input {...register('address.city')} placeholder="Mumbai" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">State</label>
              <Input {...register('address.state')} placeholder="Maharashtra" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">PIN Code</label>
              <Input {...register('address.pincode')} placeholder="400001" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Country</label>
              <Input {...register('address.country')} defaultValue="India" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Emergency Contact</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Name</label>
              <Input {...register('emergencyContacts.0.name')} placeholder="Jane Doe" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Relationship</label>
              <Input {...register('emergencyContacts.0.relationship')} placeholder="Spouse" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Phone</label>
              <Input {...register('emergencyContacts.0.phone')} placeholder="+91 9876543211" />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" loading={isPending} className="bg-medical-blue hover:bg-medical-blue/90">
            Register Patient
          </Button>
        </div>
      </form>
    </div>
  );
}
