import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import type { LoginInput, RegisterInput } from '@hims/shared';
import type { UserProfile } from '@hims/shared';

export function useMe() {
  const { isAuthenticated, setUser } = useAuthStore();
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: UserProfile }>('/auth/me');
      setUser(res.data.data);
      return res.data.data;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser, setAccessToken, setRequires2fa } = useAuthStore();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: LoginInput) => api.post<{ success: boolean; data: { accessToken?: string; requires2fa?: boolean; partialToken?: string } }>('/auth/login', data),
    onSuccess: async (res) => {
      const data = res.data.data;
      if (data.requires2fa && data.partialToken) {
        setRequires2fa(data.partialToken);
        navigate('/auth/2fa');
        return;
      }
      if (data.accessToken) {
        setAccessToken(data.accessToken);
        const meRes = await api.get<{ success: boolean; data: UserProfile }>('/auth/me');
        setUser(meRes.data.data);
        void qc.invalidateQueries({ queryKey: ['auth'] });
        toast.success('Welcome back!');
        navigate(searchParams.get('redirect') ?? '/dashboard');
      }
    },
    onError: () => {
      toast.error('Invalid credentials');
    },
  });
}

export function useLogout() {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled: () => {
      logout();
      qc.clear();
      navigate('/auth/login');
      toast.success('Logged out');
    },
  });
}

export function useRegister() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (data: RegisterInput) => api.post('/auth/register', data),
    onSuccess: () => {
      toast.success('Account created! Please check your email to verify.');
      navigate('/auth/login');
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => api.post('/auth/forgot-password', { email }),
    onSuccess: () => toast.success('Reset link sent if email exists'),
  });
}

export function useResetPassword() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (data: { token: string; password: string }) => api.post('/auth/reset-password', data),
    onSuccess: () => {
      toast.success('Password reset successfully');
      navigate('/auth/login');
    },
  });
}
