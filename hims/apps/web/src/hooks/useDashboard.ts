import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Record<string, unknown> }>('/dashboard');
      return res.data.data;
    },
    staleTime: 60_000,
  });
}
