import { Bell, Search, Moon, Sun, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/store/ui.store';
import { useAuthStore } from '@/store/auth.store';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Link } from 'react-router-dom';

export function Header() {
  const { theme, setTheme, toggleCommand } = useUIStore();
  const { user } = useAuthStore();

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => api.get('/notifications', { params: { unread: true, limit: 1 } }).then((r) => r.data.meta?.unreadCount as number ?? 0),
    refetchInterval: 30_000,
    enabled: Boolean(user),
  });

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 px-4 dark:bg-gray-900/95 dark:border-gray-800">
      {/* Search trigger */}
      <button
        onClick={toggleCommand}
        className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-500 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
      >
        <Search className="h-4 w-4" />
        <span className="hidden md:inline">Search patients, appointments...</span>
        <kbd className="hidden md:inline-flex items-center rounded border border-gray-200 px-1.5 py-0.5 text-xs dark:border-gray-700">
          ⌘K
        </kbd>
      </button>

      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Notifications */}
        <Link to="/notifications">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            {notificationsData !== undefined && notificationsData > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold">
                {notificationsData > 9 ? '9+' : notificationsData}
              </span>
            )}
          </Button>
        </Link>

        {/* User menu */}
        {user && (
          <div className="flex items-center gap-2 pl-2 border-l dark:border-gray-700">
            <div className="text-right hidden md:block">
              <p className="text-xs font-medium">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-gray-500 capitalize">{user.role.replace('_', ' ')}</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-medical-blue text-white text-xs font-semibold">
              {user.firstName.charAt(0)}{user.lastName.charAt(0)}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
