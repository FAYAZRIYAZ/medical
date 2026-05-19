import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { CreateAppointmentInput, UpdateAppointmentInput, AppointmentListInput } from '@hims/shared';

interface AppointmentMeta {
  total: number;
  totalPages: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface AppointmentsListResponse {
  data: unknown[];
  meta: { pagination: AppointmentMeta };
}

export function useAppointments(params: AppointmentListInput) {
  return useQuery({
    queryKey: ['appointments', 'list', params],
    queryFn: async (): Promise<AppointmentsListResponse> => {
      const res = await api.get<{ success: boolean; data: unknown[]; meta: { pagination: AppointmentMeta } }>('/appointments', { params });
      return { data: res.data.data, meta: res.data.meta };
    },
    staleTime: 30_000,
    placeholderData: (prev: AppointmentsListResponse | undefined) => prev,
    refetchInterval: 60_000,
  });
}

export function useAppointment(id: string) {
  return useQuery({
    queryKey: ['appointments', 'detail', id],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Record<string, unknown> }>(`/appointments/${id}`);
      return res.data.data;
    },
    enabled: Boolean(id),
  });
}

export function useTodayQueue() {
  return useQuery({
    queryKey: ['appointments', 'queue'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Record<string, unknown>[] }>('/appointments/queue');
      return res.data.data;
    },
    refetchInterval: 30_000,
  });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAppointmentInput) => api.post('/appointments', data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment booked successfully');
    },
  });
}

export function useUpdateAppointment(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateAppointmentInput) => api.patch(`/appointments/${id}`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment updated');
    },
  });
}

export function useDoctorSlots(doctorId: string, date: string) {
  return useQuery({
    queryKey: ['doctors', doctorId, 'slots', date],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: string[] }>(`/doctors/${doctorId}/slots`, { params: { date } });
      return res.data.data;
    },
    enabled: Boolean(doctorId) && Boolean(date),
  });
}
