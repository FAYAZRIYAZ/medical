import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Calendar, Stethoscope, Pill, FlaskConical,
  CreditCard, Bed, Video, Bell, Settings, ChevronLeft, ChevronRight,
  Building2, ClipboardList, Activity, UserCog, BarChart3, LogOut,
  Shield, MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';
import { useLogout } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

const ALL_NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['all'] },
  { to: '/patients', label: 'Patients', icon: Users, roles: ['hospital_admin', 'doctor', 'nurse', 'receptionist'] },
  { to: '/appointments', label: 'Appointments', icon: Calendar, roles: ['hospital_admin', 'doctor', 'nurse', 'receptionist', 'patient'] },
  { to: '/encounters', label: 'Consultations', icon: Stethoscope, roles: ['hospital_admin', 'doctor', 'nurse'] },
  { to: '/ipd', label: 'IPD', icon: Bed, roles: ['hospital_admin', 'doctor', 'nurse', 'receptionist'] },
  { to: '/pharmacy', label: 'Pharmacy', icon: Pill, roles: ['hospital_admin', 'pharmacist', 'doctor'] },
  { to: '/lab', label: 'Laboratory', icon: FlaskConical, roles: ['hospital_admin', 'lab_technician', 'doctor', 'nurse'] },
  { to: '/billing', label: 'Billing', icon: CreditCard, roles: ['hospital_admin', 'accountant', 'receptionist'] },
  { to: '/telemedicine', label: 'Telemedicine', icon: Video, roles: ['hospital_admin', 'doctor', 'patient'] },
  { to: '/chat', label: 'Chat', icon: MessageSquare, roles: ['all'] },
  { to: '/notifications', label: 'Notifications', icon: Bell, roles: ['all'] },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['hospital_admin', 'accountant'] },
  { to: '/settings', label: 'Settings', icon: Settings, roles: ['hospital_admin', 'super_admin'] },
  { to: '/admin', label: 'Admin', icon: Shield, roles: ['super_admin'] },
];

export function Sidebar() {
  const { user } = useAuthStore();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { mutate: logout } = useLogout();
  const location = useLocation();

  const navItems = ALL_NAV_ITEMS.filter((item) => {
    if (!user) return false;
    return item.roles.includes('all') || item.roles.includes(user.role);
  });

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarOpen ? 240 : 64 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="fixed left-0 top-0 z-30 flex h-full flex-col border-r bg-white dark:bg-gray-900 dark:border-gray-800"
    >
      {/* Logo */}
      <div className={cn('flex h-16 items-center border-b px-4 dark:border-gray-800', sidebarOpen ? 'justify-between' : 'justify-center')}>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-2"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-medical-blue text-white font-bold text-sm">H</div>
              <span className="text-lg font-bold text-medical-blue">HIMS</span>
            </motion.div>
          )}
        </AnimatePresence>
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8">
          {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-medical-blue text-white'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
                    !sidebarOpen && 'justify-center'
                  )
                }
                title={!sidebarOpen ? item.label : undefined}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="truncate"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Helpline */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-3 pb-2"
          >
            <div className="rounded-md bg-medical-blue/10 px-3 py-2 text-center">
              <p className="text-[10px] font-medium text-medical-blue uppercase tracking-wide">Helpline</p>
              <p className="text-sm font-bold text-medical-blue">9347832031</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User + Logout */}
      <div className="border-t p-3 dark:border-gray-800">
        <div className={cn('flex items-center gap-3', !sidebarOpen && 'justify-center')}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-medical-blue text-white text-xs font-semibold">
            {user ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}` : '?'}
          </div>
          <AnimatePresence>
            {sidebarOpen && user && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{user.firstName} {user.lastName}</p>
                <p className="truncate text-xs text-gray-500 capitalize">{user.role.replace('_', ' ')}</p>
              </motion.div>
            )}
          </AnimatePresence>
          {sidebarOpen && (
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => logout()}>
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
