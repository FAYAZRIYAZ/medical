import { useDashboard } from '@/hooks/useDashboard';
import { useAuthStore } from '@/store/auth.store';
import { ROLES } from '@hims/shared';
import { AdminDashboard } from './AdminDashboard';
import { DoctorDashboard } from './DoctorDashboard';
import { ReceptionDashboard } from './ReceptionDashboard';
import { PatientDashboard } from './PatientDashboard';
import { PharmacyDashboard } from './PharmacyDashboard';
import { LabDashboard } from './LabDashboard';
import { Skeleton } from '@/components/ui/skeleton';

export function DashboardPage() {
  const { user } = useAuthStore();
  const { data, isLoading } = useDashboard();

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    );
  }

  const role = user?.role;

  if (role === ROLES.HOSPITAL_ADMIN || role === ROLES.SUPER_ADMIN) return <AdminDashboard data={data} />;
  if (role === ROLES.DOCTOR) return <DoctorDashboard data={data} />;
  if (role === ROLES.RECEPTIONIST) return <ReceptionDashboard data={data} />;
  if (role === ROLES.PATIENT) return <PatientDashboard data={data} />;
  if (role === ROLES.PHARMACIST) return <PharmacyDashboard data={data} />;
  if (role === ROLES.LAB_TECHNICIAN || role === ROLES.RADIOLOGIST) return <LabDashboard data={data} />;

  return <AdminDashboard data={data} />;
}
