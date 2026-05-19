import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Calendar, Pill, FlaskConical, CreditCard, Settings } from 'lucide-react';
import { useUIStore } from '@/store/ui.store';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

const STATIC_COMMANDS = [
  { label: 'Patients', icon: Users, to: '/patients', shortcut: 'P' },
  { label: 'New Appointment', icon: Calendar, to: '/appointments/new', shortcut: 'A' },
  { label: 'Pharmacy', icon: Pill, to: '/pharmacy', shortcut: '' },
  { label: 'Laboratory', icon: FlaskConical, to: '/lab', shortcut: '' },
  { label: 'Billing', icon: CreditCard, to: '/billing', shortcut: '' },
  { label: 'Settings', icon: Settings, to: '/settings', shortcut: '' },
];

export function CommandPalette() {
  const { commandOpen, toggleCommand } = useUIStore();
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleCommand();
      }
      if (e.key === 'Escape' && commandOpen) toggleCommand();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [commandOpen, toggleCommand]);

  const { data: patientResults } = useQuery({
    queryKey: ['command', 'patients', query],
    queryFn: () => api.get('/patients', { params: { q: query, limit: 5 } }).then((r) => r.data.data as Array<{ _id: string; firstName: string; lastName: string; uhid: string }>),
    enabled: query.length > 1 && commandOpen,
    staleTime: 0,
  });

  if (!commandOpen) return null;

  const handleSelect = (to: string) => {
    navigate(to);
    setQuery('');
    toggleCommand();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={toggleCommand} />

      {/* Panel */}
      <div className="relative w-full max-w-lg rounded-xl border bg-white shadow-2xl dark:bg-gray-900 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center gap-3 border-b px-4 dark:border-gray-700">
          <Search className="h-4 w-4 text-gray-400 shrink-0" />
          <input
            autoFocus
            className="flex-1 py-4 text-sm outline-none bg-transparent placeholder:text-gray-400"
            placeholder="Search patients, commands..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd className="rounded border border-gray-200 px-1.5 py-0.5 text-xs text-gray-500 dark:border-gray-700">ESC</kbd>
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {/* Patient results */}
          {patientResults && patientResults.length > 0 && (
            <div className="mb-2">
              <p className="px-2 py-1.5 text-xs font-medium text-gray-400 uppercase">Patients</p>
              {patientResults.map((p) => (
                <button key={p._id} className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSelect(`/patients/${p._id}`)}>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                    {p.firstName.charAt(0)}{p.lastName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium">{p.firstName} {p.lastName}</p>
                    <p className="text-xs text-gray-500">{p.uhid}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Static commands */}
          <div>
            <p className="px-2 py-1.5 text-xs font-medium text-gray-400 uppercase">Quick navigate</p>
            {STATIC_COMMANDS.filter((c) => !query || c.label.toLowerCase().includes(query.toLowerCase())).map((cmd) => (
              <button key={cmd.to} className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSelect(cmd.to)}>
                <cmd.icon className="h-4 w-4 text-gray-400" />
                <span>{cmd.label}</span>
                {cmd.shortcut && <kbd className="ml-auto rounded border border-gray-200 px-1.5 py-0.5 text-xs dark:border-gray-700">{cmd.shortcut}</kbd>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
