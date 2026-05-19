import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { CreatePatientInput, UpdatePatientInput, PatientSearchInput } from '@hims/shared';

interface PatientMeta {
  total: number;
  totalPages: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface PatientsListResponse {
  data: unknown[];
  meta: { pagination: PatientMeta };
}

const KEYS = {
  list: (params: PatientSearchInput) => ['patients', 'list', params] as const,
  detail: (id: string) => ['patients', 'detail', id] as const,
  stats: () => ['patients', 'stats'] as const,
};

export function usePatients(params: PatientSearchInput) {
  return useQuery({
    queryKey: KEYS.list(params),
    queryFn: async (): Promise<PatientsListResponse> => {
      const res = await api.get<{ success: boolean; data: unknown[]; meta: { pagination: PatientMeta } }>('/patients', { params });
      return { data: res.data.data, meta: res.data.meta };
    },
    staleTime: 30_000,
    placeholderData: (prev: PatientsListResponse | undefined) => prev,
  });
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Record<string, unknown> }>(`/patients/${id}`);
      return res.data.data;
    },
    enabled: Boolean(id),
  });
}

export function usePatientStats() {
  return useQuery({
    queryKey: KEYS.stats(),
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Record<string, unknown> }>('/patients/stats');
      return res.data.data;
    },
    staleTime: 60_000,
  });
}

export function useCreatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePatientInput) => api.post('/patients', data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['patients'] });
      toast.success('Patient registered successfully');
    },
  });
}

export function useUpdatePatient(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdatePatientInput) => api.patch(`/patients/${id}`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.detail(id) });
      void qc.invalidateQueries({ queryKey: ['patients', 'list'] });
      toast.success('Patient updated');
    },
  });
}
