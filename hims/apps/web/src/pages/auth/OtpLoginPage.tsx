import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { Phone, ArrowRight } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { UserProfile } from '@hims/shared';

const PhoneSchema = z.object({ phone: z.string().min(10).max(15) });
const OtpSchema = z.object({ otp: z.string().length(6) });

type PhoneInput = z.infer<typeof PhoneSchema>;
type OtpInput = z.infer<typeof OtpSchema>;

export function OtpLoginPage() {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const navigate = useNavigate();
  const { setUser, setAccessToken } = useAuthStore();

  const phoneForm = useForm<PhoneInput>({ resolver: zodResolver(PhoneSchema) });
  const otpForm = useForm<OtpInput>({ resolver: zodResolver(OtpSchema) });

  const sendOtp = useMutation({
    mutationFn: (data: PhoneInput) => api.post('/auth/otp/send', data),
    onSuccess: (_, vars) => { setPhone(vars.phone); setStep('otp'); toast.success('OTP sent'); },
  });

  const verifyOtp = useMutation({
    mutationFn: (data: OtpInput) => api.post<{ success: boolean; data: { accessToken: string; user: UserProfile } }>('/auth/otp/verify', { phone, otp: data.otp }),
    onSuccess: async (res) => {
      setAccessToken(res.data.data.accessToken);
      setUser(res.data.data.user);
      toast.success('Welcome!');
      navigate('/dashboard');
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-teal-50">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-medical-blue text-white text-2xl font-bold">H</div>
            <h1 className="text-2xl font-bold text-gray-900">Patient Login</h1>
            <p className="text-sm text-gray-500 mt-1">Login with your mobile number</p>
          </div>

          {step === 'phone' ? (
            <form onSubmit={phoneForm.handleSubmit((d) => sendOtp.mutate(d))} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Mobile Number</label>
                <div className="flex gap-2">
                  <span className="flex items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">+91</span>
                  <Input placeholder="9876543210" {...phoneForm.register('phone')} />
                </div>
                {phoneForm.formState.errors.phone && <p className="mt-1 text-xs text-red-600">{phoneForm.formState.errors.phone.message}</p>}
              </div>
              <Button type="submit" loading={sendOtp.isPending} className="w-full gap-2 bg-medical-blue hover:bg-medical-blue/90">
                <Phone className="h-4 w-4" /> Send OTP
              </Button>
            </form>
          ) : (
            <form onSubmit={otpForm.handleSubmit((d) => verifyOtp.mutate(d))} className="space-y-5">
              <p className="text-sm text-gray-600">OTP sent to <span className="font-semibold">{phone}</span></p>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Enter OTP</label>
                <Input placeholder="123456" maxLength={6} {...otpForm.register('otp')} className="text-center text-xl tracking-widest" />
                {otpForm.formState.errors.otp && <p className="mt-1 text-xs text-red-600">{otpForm.formState.errors.otp.message}</p>}
              </div>
              <Button type="submit" loading={verifyOtp.isPending} className="w-full gap-2 bg-medical-blue hover:bg-medical-blue/90">
                <ArrowRight className="h-4 w-4" /> Verify & Login
              </Button>
              <button type="button" className="w-full text-sm text-gray-500 hover:text-gray-700" onClick={() => setStep('phone')}>
                Change number
              </button>
            </form>
          )}

          <div className="mt-4 text-center text-sm text-gray-500">
            Staff? <Link to="/auth/login" className="text-medical-blue hover:underline font-medium">Sign in with password</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
