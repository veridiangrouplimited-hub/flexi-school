import { useTenant } from '../context/TenantContext';

export type FlagKey =
  | 'hostel'
  | 'sports'
  | 'finance'
  | 'alumni'
  | 'write_access';

/**
 * Returns true if the given feature flag is enabled for the current tenant.
 *
 * @example
 *   const hasHostel = useFeatureFlag('hostel');
 *   if (!hasHostel) return null;
 */
export function useFeatureFlag(flag: FlagKey): boolean {
  const { flags } = useTenant();
  return flags?.[flag] ?? false;
}

/**
 * Returns the full flags map — use when you need multiple flags at once
 * without calling useFeatureFlag repeatedly.
 */
export function useFeatureFlags(): Record<string, boolean> {
  return useTenant().flags;
}

/**
 * Convenience: returns false when subscription is PAST_DUE or SUSPENDED,
 * blocking all create/update/delete actions in the UI.
 */
export function useWriteAccess(): boolean {
  return useTenant().subStatus === 'ACTIVE';
}
