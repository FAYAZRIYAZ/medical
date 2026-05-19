import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChangePasswordSchema, type ChangePasswordInput } from '@hims/shared';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUIStore } from '@/store/ui.store';
import { useAuthStore } from '@/store/auth.store';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { initials } from '@/lib/utils';
import { Eye, EyeOff, Moon, Sun, Monitor } from 'lucide-react';

export function SettingsPage() {
  const [showPwd, setShowPwd] = useState(false);
  const { user } = useAuthStore();
  const { theme, setTheme, density, setDensity } = useUIStore();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ChangePasswordInput>({
    resolver: zodResolver(ChangePasswordSchema),
  });

  const changePassword = useMutation({
    mutationFn: (data: ChangePasswordInput) => api.post('/auth/change-password', data),
    onSuccess: () => { toast.success('Password changed successfully'); reset(); },
  });

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Profile Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-medical-blue text-white text-xl">{initials(`${user?.firstName ?? ''} ${user?.lastName ?? ''}`)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-lg">{user?.firstName} {user?.lastName}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <p className="text-xs text-muted-foreground capitalize mt-0.5">{user?.role?.replace('_', ' ')}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Name</p>
                  <Input defaultValue={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`} disabled />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Email</p>
                  <Input defaultValue={user?.email} disabled />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Role</p>
                  <Input defaultValue={user?.role} disabled />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Contact your administrator to update profile information.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Change Password</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit((d) => changePassword.mutate(d))} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Current Password</label>
                  <Input type="password" {...register('currentPassword')} />
                  {errors.currentPassword && <p className="mt-1 text-xs text-red-600">{errors.currentPassword.message}</p>}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">New Password</label>
                  <div className="relative">
                    <Input type={showPwd ? 'text' : 'password'} {...register('newPassword')} className="pr-10" />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" onClick={() => setShowPwd(!showPwd)}>
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.newPassword && <p className="mt-1 text-xs text-red-600">{errors.newPassword.message}</p>}
                </div>
                <Button type="submit" loading={changePassword.isPending} className="bg-medical-blue hover:bg-medical-blue/90">
                  Update Password
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Theme</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { value: 'light', label: 'Light', icon: Sun },
                  { value: 'dark', label: 'Dark', icon: Moon },
                  { value: 'system', label: 'System', icon: Monitor },
                ] as const).map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${theme === value ? 'border-medical-blue bg-medical-blue/5' : 'border-border hover:border-medical-blue/50'}`}
                    onClick={() => setTheme(value)}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Display Density</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {(['comfortable', 'compact'] as const).map((d) => (
                  <button
                    key={d}
                    className={`p-4 rounded-lg border-2 transition-colors capitalize ${density === d ? 'border-medical-blue bg-medical-blue/5' : 'border-border hover:border-medical-blue/50'}`}
                    onClick={() => setDensity(d)}
                  >
                    <span className="text-sm font-medium">{d}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
