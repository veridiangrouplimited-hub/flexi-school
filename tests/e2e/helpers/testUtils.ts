import { Page } from '@playwright/test';

interface SeedOptions {
  boardingType?: 'DAY_ONLY' | 'BOARDING_ONLY' | 'HYBRID';
  level?:        'PRIMARY' | 'SECONDARY' | 'K_12';
  subStatus?:    'ACTIVE' | 'PAST_DUE' | 'SUSPENDED';
}

interface SeedResult {
  subdomain:   string;
  tenantId:    string;
  credentials: {
    admin:    { email: string; password: string };
    teacher:  { email: string; password: string };
    parent:   { email: string; password: string };
  };
}

const API_URL = process.env.TEST_API_URL ?? 'http://localhost:4000';

export async function seedTenant(options: SeedOptions = {}): Promise<SeedResult> {
  const res = await fetch(`${API_URL}/test-utils/seed-tenant`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      boardingType: options.boardingType ?? 'HYBRID',
      level:        options.level        ?? 'SECONDARY',
      subStatus:    options.subStatus    ?? 'ACTIVE',
    }),
  });

  if (!res.ok) {
    throw new Error(`seedTenant failed: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

export async function loginAs(
  page: Page,
  subdomain: string,
  credentials: { email: string; password: string },
): Promise<void> {
  await page.goto(`http://${subdomain}.flexischool.test/login`);
  await page.fill('[name="email"]',    credentials.email);
  await page.fill('[name="password"]', credentials.password);
  await page.click('[type="submit"]');
  await page.waitForURL(/\/dashboard/);
}
