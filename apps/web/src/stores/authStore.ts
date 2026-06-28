import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role =
  | 'SUPER_ADMIN'
  | 'SCHOOL_ADMIN'
  | 'PRINCIPAL'
  | 'TEACHER'
  | 'PARENT'
  | 'STUDENT';

interface AuthState {
  userId:      string | null;
  role:        Role   | null;
  permissions: string[];
  tenantId:    string | null;
  token:       string | null;
}

interface AuthActions {
  setSession: (payload: AuthState) => void;
  can:        (permission: string) => boolean;
  hasRole:    (role: Role | Role[]) => boolean;
  clear:      () => void;
}

const initialState: AuthState = {
  userId:      null,
  role:        null,
  permissions: [],
  tenantId:    null,
  token:       null,
};

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      setSession: (payload) => set(payload),

      can: (permission) => get().permissions.includes(permission),

      hasRole: (role) => {
        const current = get().role;
        if (!current) return false;
        return Array.isArray(role) ? role.includes(current) : current === role;
      },

      clear: () => set(initialState),
    }),
    {
      name: 'flexischool-auth',
      // Only persist non-sensitive shape; token lives in memory + httpOnly cookie in production
      partialize: (state) => ({
        userId:   state.userId,
        role:     state.role,
        tenantId: state.tenantId,
      }),
    },
  ),
);
