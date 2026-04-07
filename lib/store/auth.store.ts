import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'ceo' | 'founder' | 'investor' | 'finance';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => {
        localStorage.setItem('incubatex_token', token);
        // Mirror in cookie so middleware can read it (7-day expiry matches JWT)
        document.cookie = `incubatex_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
        set({ user, token, isAuthenticated: true });
      },
      logout: () => {
        localStorage.removeItem('incubatex_token');
        document.cookie = 'incubatex_token=; path=/; max-age=0';
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: 'incubatex-auth',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    },
  ),
);
