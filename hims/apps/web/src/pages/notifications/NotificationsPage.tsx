import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, BellOff, CheckCheck, Calendar, FlaskConical, DollarSign, BedDouble, FileText, AlertTriangle, Info } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  data?: { appointmentId?: string; patientId?: string; admissionId?: string; orderId?: string; invoiceId?: string; prescriptionId?: string };
  isRead: boolean;
  createdAt: string;
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string; link?: (n: Notification) => string }> = {
  appointment: { icon: <Calendar className="h-4 w-4" />, color: 'bg-blue-100 text-blue-600', label: 'Appointment', link: () => '/appointments' },
  appointment_status: { icon: <Calendar className="h-4 w-4" />, color: 'bg-blue-100 text-blue-600', label: 'Appointment', link: () => '/appointments' },
  lab_report: { icon: <FlaskConical className="h-4 w-4" />, color: 'bg-purple-100 text-purple-600', label: 'Lab', link: (n) => n.data?.orderId ? `/lab/${n.data.orderId}` : '/lab' },
  lab_report_ready: { icon: <FlaskConical className="h-4 w-4" />, color: 'bg-purple-100 text-purple-600', label: 'Lab', link: (n) => n.data?.orderId ? `/lab/${n.data.orderId}` : '/lab' },
  payment: { icon: <DollarSign className="h-4 w-4" />, color: 'bg-green-100 text-green-600', label: 'Payment', link: (n) => n.data?.invoiceId ? `/billing/${n.data.invoiceId}` : '/billing' },
  payment_received: { icon: <DollarSign className="h-4 w-4" />, color: 'bg-green-100 text-green-600', label: 'Payment', link: (n) => n.data?.invoiceId ? `/billing/${n.data.invoiceId}` : '/billing' },
  emergency: { icon: <AlertTriangle className="h-4 w-4" />, color: 'bg-red-100 text-red-600', label: 'Alert', link: (n) => n.data?.admissionId ? `/ipd/${n.data.admissionId}` : '/ipd' },
  prescription: { icon: <FileText className="h-4 w-4" />, color: 'bg-yellow-100 text-yellow-600', label: 'Prescription', link: () => '/encounters' },
  prescription_ready: { icon: <FileText className="h-4 w-4" />, color: 'bg-yellow-100 text-yellow-600', label: 'Prescription', link: () => '/encounters' },
  general: { icon: <Info className="h-4 w-4" />, color: 'bg-gray-100 text-gray-600', label: 'General', link: () => '/dashboard' },
  admitted: { icon: <BedDouble className="h-4 w-4" />, color: 'bg-red-100 text-red-600', label: 'IPD Admitted', link: (n) => n.data?.admissionId ? `/ipd/${n.data.admissionId}` : '/ipd' },
  discharged: { icon: <BedDouble className="h-4 w-4" />, color: 'bg-teal-100 text-teal-600', label: 'IPD Discharged', link: () => '/ipd' },
};

function getConfig(type: string) {
  return TYPE_CONFIG[type] ?? { icon: <Bell className="h-4 w-4" />, color: 'bg-gray-100 text-gray-600', label: 'Notification', link: () => '/dashboard' };
}

function timeAgo(date: string) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
}

export function NotificationsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', { unreadOnly }],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Notification[]; meta: { unreadCount: number } }>(
        '/notifications',
        { params: { limit: 50, ...(unreadOnly ? { unread: 'true' } : {}) } }
      );
      return { notifications: res.data.data, unreadCount: res.data.meta?.unreadCount ?? 0 };
    },
    refetchInterval: 30_000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            Notifications
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold">{unreadCount}</span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={unreadOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setUnreadOnly((v) => !v)}
            className={unreadOnly ? 'bg-medical-blue hover:bg-medical-blue/90' : ''}
          >
            {unreadOnly ? 'Show all' : 'Unread only'}
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="gap-1.5"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20">
          <BellOff className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900">No notifications</p>
          <p className="text-sm text-muted-foreground mt-1">
            {unreadOnly ? 'Switch to "Show all" to see past notifications' : "You're all caught up!"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const cfg = getConfig(n.type);
            const linkTarget = cfg.link?.(n) ?? '/dashboard';
            return (
              <div
                key={n._id}
                className={cn(
                  'relative flex items-start gap-4 p-4 rounded-xl border transition-all',
                  !n.isRead ? 'bg-blue-50/60 border-blue-100' : 'bg-white hover:bg-muted/30 border-gray-100'
                )}
              >
                {!n.isRead && (
                  <span className="absolute top-4 right-4 h-2 w-2 rounded-full bg-blue-500" />
                )}
                <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', cfg.color)}>
                  {cfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                    <Badge variant="outline" className="text-xs py-0 px-1.5 font-normal">{cfg.label}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5 leading-snug">{n.message}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-muted-foreground">{timeAgo(n.createdAt)}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <Link to={linkTarget}>
                      <span className="text-xs text-medical-blue hover:underline cursor-pointer">View details</span>
                    </Link>
                    {!n.isRead && (
                      <>
                        <span className="text-xs text-muted-foreground">·</span>
                        <button
                          className="text-xs text-muted-foreground hover:text-gray-700"
                          onClick={() => markRead.mutate(n._id)}
                          disabled={markRead.isPending}
                        >
                          Mark read
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
