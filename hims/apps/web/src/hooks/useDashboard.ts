import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { ROLES } from '@hims/shared';

function roleToEndpoint(role?: string): string {
  switch (role) {
    case ROLES.DOCTOR: return '/dashboard/doctor';
    case ROLES.RECEPTIONIST: return '/dashboard/reception';
    case ROLES.PATIENT: return '/dashboard/patient';
    case ROLES.PHARMACIST: return '/dashboard/pharmacy';
    case ROLES.LAB_TECHNICIAN:
    case ROLES.RADIOLOGIST: return '/dashboard/lab';
    default: return '/dashboard/admin';
  }
}

export function useDashboard() {
  const { user } = useAuthStore();
  const endpoint = roleToEndpoint(user?.role);

  return useQuery({
    queryKey: ['dashboard', endpoint],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Record<string, unknown> }>(endpoint);
      return res.data.data;
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
    enabled: !!user,
  });
}

export function useInvalidateDashboard() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: ['dashboard'] });
}
