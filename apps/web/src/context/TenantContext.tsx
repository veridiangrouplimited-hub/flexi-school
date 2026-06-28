import { createContext, useContext, ReactNode } from 'react';

export interface TenantState {
  id: string;
  name: string;
  level: 'PRIMARY' | 'SECONDARY' | 'K_12';
  boardingType: 'DAY_ONLY' | 'BOARDING_ONLY' | 'HYBRID';
  subStatus: 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED';
  flags: Record<string, boolean>;
  branding: {
    logoUrl?: string;
    primaryColor?: string;
    schoolMotto?: string;
  };
}

const TenantContext = createContext<TenantState | null>(null);

export function TenantProvider({
  children,
  tenant,
}: {
  children: ReactNode;
  tenant: TenantState;
}) {
  return (
    <TenantContext.Provider value={tenant}>{children}</TenantContext.Provider>
  );
}

export function useTenant(): TenantState {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used inside TenantProvider');
  return ctx;
}
