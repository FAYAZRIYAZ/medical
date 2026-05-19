import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { z } from 'zod';
import { useResetPassword } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const Schema = z.object({
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { path: ['confirm'], message: 'Passwords do not match' });

type FormInput = z.infer<typeof Schema>;

export function ResetPasswordPage() {
  const [showPwd, setShowPwd] = useState(false);
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const { mutate, isPending } = useResetPassword();

  const { register, handleSubmit, formState: { errors } } = useForm<FormInput>({ resolver: zodResolver(Schema) });

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-teal-50">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-medical-blue text-white">
              <KeyRound className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
            <p className="text-sm text-gray-500 mt-1">Choose a strong new password</p>
          </div>

          <form onSubmit={handleSubmit((d) => mutate({ token, password: d.password }))} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">New Password</label>
              <div className="relative">
                <Input type={showPwd ? 'text' : 'password'} {...register('password')} className="pr-10" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" onClick={() => setShowPwd(!showPwd)}>
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Confirm Password</label>
              <Input type={showPwd ? 'text' : 'password'} {...register('confirm')} />
              {errors.confirm && <p className="mt-1 text-xs text-red-600">{errors.confirm.message}</p>}
            </div>
            <Button type="submit" loading={isPending} className="w-full bg-medical-blue hover:bg-medical-blue/90">
              Reset Password
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
