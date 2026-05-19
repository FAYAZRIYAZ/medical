import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Stethoscope, Calendar } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Encounter {
  _id: string;
  encounterType: 'opd' | 'ipd' | 'emergency' | 'telemedicine';
  encounterDate: string;
  chiefComplaints: string[];
  status: 'in_progress' | 'completed' | 'cancelled';
  isSigned: boolean;
  diagnosis: { description: string; type: string }[];
  patientId: { firstName: string; lastName: string; uhid: string } | string;
  doctorId: { firstName: string; lastName: string; specialization: string } | string;
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'warning' | 'success' | 'destructive'> = {
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'destructive',
};

const TYPE_COLOR: Record<string, string> = {
  opd: 'bg-blue-100 text-blue-600',
  ipd: 'bg-purple-100 text-purple-600',
  emergency: 'bg-red-100 text-red-600',
  telemedicine: 'bg-green-100 text-green-600',
};

export function EncountersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['encounters'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Encounter[] }>('/encounters', {
        params: { limit: 50 },
      });
      return res.data.data;
    },
    refetchInterval: 30_000,
  });

  const encounters = data ?? [];

  const patientName = (e: Encounter) =>
    typeof e.patientId === 'object'
      ? `${e.patientId.firstName} ${e.patientId.lastName}`
      : e.patientId;

  const patientUhid = (e: Encounter) =>
    typeof e.patientId === 'object' ? e.patientId.uhid : '';

  const doctorName = (e: Encounter) =>
    typeof e.doctorId === 'object'
      ? `Dr. ${e.doctorId.firstName} ${e.doctorId.lastName}`
      : e.doctorId;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Consultations</h1>
        <p className="text-sm text-muted-foreground">Patient encounter and consultation records</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : encounters.length === 0 ? (
        <div className="text-center py-20">
          <Stethoscope className="h-14 w-14 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900">No consultation records</p>
          <p className="text-sm text-muted-foreground mt-1">
            Consultations are created when doctors see patients in OPD
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {encounters.map((enc) => (
            <Card key={enc._id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full shrink-0 ${TYPE_COLOR[enc.encounterType] ?? 'bg-muted text-muted-foreground'}`}>
                  <Stethoscope className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 truncate">{patientName(enc)}</p>
                    {patientUhid(enc) && (
                      <span className="text-xs text-muted-foreground">{patientUhid(enc)}</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{doctorName(enc)}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(enc.encounterDate)}
                    </span>
                    <Badge variant="outline" className="text-xs capitalize">
                      {enc.encounterType.replace('_', ' ')}
                    </Badge>
                  </div>
                  {enc.chiefComplaints.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      cc: {enc.chiefComplaints.join(', ')}
                    </p>
                  )}
                  {enc.diagnosis.length > 0 && (
                    <p className="text-xs text-muted-foreground truncate">
                      dx: {enc.diagnosis[0]?.description}
                      {enc.diagnosis.length > 1 ? ` +${enc.diagnosis.length - 1} more` : ''}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Badge variant={STATUS_VARIANT[enc.status] ?? 'secondary'}>
                    {enc.status.replace(/_/g, ' ')}
                  </Badge>
                  {enc.isSigned && (
                    <span className="text-xs text-green-600 font-medium">Signed</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
