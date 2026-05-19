import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Plus, User } from 'lucide-react';
import { usePatients } from '@/hooks/usePatients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { initials, calculateAge } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';

interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  uhid: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup?: string;
  phone: string;
  photoUrl?: string;
}

export function PatientsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = usePatients({ q: debouncedSearch, page, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' });
  const patients = (data?.data ?? []) as unknown as Patient[];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          <p className="text-sm text-muted-foreground">
            {data?.meta?.pagination?.total ?? 0} total patients registered
          </p>
        </div>
        <Link to="/patients/new">
          <Button className="gap-2 bg-medical-blue hover:bg-medical-blue/90">
            <Plus className="h-4 w-4" /> Register Patient
          </Button>
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by name, UHID, phone, or email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : patients.length === 0 ? (
        <div className="text-center py-16">
          <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900">No patients found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {search ? 'Try a different search term' : 'Register the first patient to get started'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {patients.map((patient) => (
              <Card
                key={patient._id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/patients/${patient._id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12 shrink-0">
                      {patient.photoUrl && <AvatarImage src={patient.photoUrl} />}
                      <AvatarFallback className="bg-medical-blue text-white text-sm">
                        {initials(`${patient.firstName} ${patient.lastName}`)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{patient.firstName} {patient.lastName}</p>
                      <p className="text-xs text-muted-foreground">{patient.uhid}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {calculateAge(patient.dateOfBirth)} yr · {patient.gender}
                        </Badge>
                        {patient.bloodGroup && <Badge variant="outline" className="text-xs">{patient.bloodGroup}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{patient.phone}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {(data?.meta?.pagination?.totalPages ?? 1) > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                Previous
              </Button>
              <span className="flex items-center text-sm text-muted-foreground px-3">
                Page {page} of {data?.meta?.pagination?.totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page === data?.meta?.pagination?.totalPages} onClick={() => setPage(p => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
