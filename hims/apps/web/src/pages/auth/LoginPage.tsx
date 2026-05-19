import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useState } from 'react';
import { LoginSchema, type LoginInput } from '@hims/shared';
import { useLogin } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function LoginPage() {
  const [showPwd, setShowPwd] = useState(false);
  const { mutate: login, isPending } = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-teal-50">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl bg-white p-8 shadow-xl">
          {/* Logo */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-medical-blue text-white text-2xl font-bold">H</div>
            <h1 className="text-2xl font-bold text-gray-900">HIMS</h1>
            <p className="text-sm text-gray-500 mt-1">Hospital Information & Management System</p>
          </div>

          <h2 className="mb-6 text-xl font-semibold text-gray-800">Sign in to your account</h2>

          <form onSubmit={handleSubmit((data) => login(data))} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">Email address</label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="doctor@hospital.com"
                {...register('email')}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">Password</label>
                <Link to="/auth/forgot-password" className="text-xs text-medical-blue hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register('password')}
                  className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setShowPwd(!showPwd)}>
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>

            <Button type="submit" loading={isPending} className="w-full gap-2 bg-medical-blue hover:bg-medical-blue/90">
              <LogIn className="h-4 w-4" />
              Sign In
            </Button>
          </form>

          {/* OTP login link for patients */}
          <div className="mt-4 text-center text-sm text-gray-500">
            Patient?{' '}
            <Link to="/auth/login-otp" className="text-medical-blue hover:underline font-medium">Login with OTP</Link>
          </div>

          {/* Demo credentials hint */}
          <div className="mt-6 rounded-lg bg-blue-50 p-4 text-xs text-blue-700">
            <p className="font-semibold mb-1">Demo credentials:</p>
            <p>Admin: admin@citygeneral.in / Admin@123</p>
            <p>Doctor: dr.mehta@citygeneral.in / User@1234</p>
            <p>Patient: rahul.verma@email.com / Patient@123</p>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} HIMS. All rights reserved.
        </p>
      </div>
    </div>
  );
}
