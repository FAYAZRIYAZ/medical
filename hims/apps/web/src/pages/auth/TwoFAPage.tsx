import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ShieldCheck } from 'lucide-react';
import { z } from 'zod';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { UserProfile } from '@hims/shared';

const Schema = z.object({ code: z.string().min(6).max(8) });
type Input = z.infer<typeof Schema>;

export function TwoFAPage() {
  const navigate = useNavigate();
  const { partialToken, setUser, setAccessToken } = useAuthStore();

  const { register, handleSubmit, formState: { errors } } = useForm<Input>({ resolver: zodResolver(Schema) });

  const verify = useMutation({
    mutationFn: (data: Input) =>
      api.post<{ success: boolean; data: { accessToken: string; user: UserProfile } }>('/auth/2fa/verify', {
        code: data.code,
        partialToken,
      }),
    onSuccess: (res) => {
      setAccessToken(res.data.data.accessToken);
      setUser(res.data.data.user);
      toast.success('Welcome back!');
      navigate('/dashboard');
    },
  });

  if (!partialToken) {
    navigate('/auth/login');
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-teal-50">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-xl text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-medical-blue text-white">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Two-Factor Authentication</h1>
          <p className="text-sm text-gray-500 mb-6">Enter the 6-digit code from your authenticator app</p>

          <form onSubmit={handleSubmit((d) => verify.mutate(d))} className="space-y-4">
            <Input
              placeholder="000000"
              maxLength={8}
              className="text-center text-2xl tracking-widest font-mono"
              {...register('code')}
            />
            {errors.code && <p className="text-xs text-red-600">{errors.code.message}</p>}
            <Button type="submit" loading={verify.isPending} className="w-full bg-medical-blue hover:bg-medical-blue/90">
              Verify
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
