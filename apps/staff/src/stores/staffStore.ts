import { create } from 'zustand';

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'owner' | 'manager' | 'chef' | 'waiter';
  cafeId: string | null;
  cafe?: {
    id: string;
    name: string;
    slug: string;
    status: string;
  } | null;
  permissions?: Record<string, boolean> | null;
}

interface StaffState {
  user: StaffUser | null;
  token: string | null;
  soundEnabled: boolean;

  setAuth: (user: StaffUser, token: string) => void;
  toggleSound: () => void;
  logout: () => void;
}

export const useStaffStore = create<StaffState>((set) => {
  const savedToken = localStorage.getItem('tableqr_staff_token');
  const savedUser = localStorage.getItem('tableqr_staff_user');

  return {
    user: savedUser ? JSON.parse(savedUser) : null,
    token: savedToken,
    soundEnabled: localStorage.getItem('tableqr_sound') !== 'false',

    setAuth: (user, token) => {
      localStorage.setItem('tableqr_staff_token', token);
      localStorage.setItem('tableqr_staff_user', JSON.stringify(user));
      set({ user, token });
    },

    toggleSound: () => {
      set((prev) => {
        const next = !prev.soundEnabled;
        localStorage.setItem('tableqr_sound', String(next));
        return { soundEnabled: next };
      });
    },

    logout: () => {
      localStorage.removeItem('tableqr_staff_token');
      localStorage.removeItem('tableqr_staff_user');
      set({ user: null, token: null });
    },
  };
});
