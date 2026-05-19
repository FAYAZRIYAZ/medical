import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { ForgotPasswordSchema, type ForgotPasswordInput } from '@hims/shared';
import { useForgotPassword } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function ForgotPasswordPage() {
  const { mutate, isPending, isSuccess } = useForgotPassword();
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(ForgotPasswordSchema),
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-teal-50">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-medical-blue text-white">
              <Mail className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Forgot Password?</h1>
            <p className="text-sm text-gray-500 mt-1">We'll send you a reset link</p>
          </div>

          {isSuccess ? (
            <div className="rounded-lg bg-green-50 p-4 text-center text-sm text-green-700">
              <p className="font-semibold">Check your email!</p>
              <p className="mt-1">If that email exists in our system, we've sent a reset link.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit((d) => mutate(d.email))} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Email address</label>
                <Input type="email" placeholder="doctor@hospital.com" {...register('email')} />
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
              </div>
              <Button type="submit" loading={isPending} className="w-full bg-medical-blue hover:bg-medical-blue/90">
                Send Reset Link
              </Button>
            </form>
          )}

          <div className="mt-4 text-center text-sm text-gray-500">
            <Link to="/auth/login" className="text-medical-blue hover:underline">Back to login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
