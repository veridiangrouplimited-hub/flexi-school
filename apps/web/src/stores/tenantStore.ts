import { create } from 'zustand';
import type { TenantState } from '../context/TenantContext';

interface TenantStore {
  tenant: TenantState | null;
  setTenant: (t: TenantState | null) => void;
}

export const useTenantStore = create<TenantStore>((set) => ({
  tenant:    null,
  setTenant: (tenant) => set({ tenant }),
}));
