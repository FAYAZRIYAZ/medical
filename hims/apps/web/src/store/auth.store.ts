import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UserProfile } from '@hims/shared';

interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  requires2fa: boolean;
  partialToken: string | null;

  setUser: (user: UserProfile) => void;
  setAccessToken: (token: string) => void;
  setRequires2fa: (partialToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      requires2fa: false,
      partialToken: null,

      setUser: (user) => set({ user, isAuthenticated: true }),
      setAccessToken: (token) => set({ accessToken: token }),
      setRequires2fa: (partialToken) => set({ requires2fa: true, partialToken }),
      logout: () => set({ user: null, accessToken: null, isAuthenticated: false, requires2fa: false, partialToken: null }),
    }),
    {
      name: 'hims-auth',
      storage: createJSONStorage(() => localStorage),
      // Don't persist accessToken (it's short-lived, use refresh cookie)
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
