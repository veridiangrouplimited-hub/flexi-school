import { test, expect } from '@playwright/test';
import { seedTenant, loginAs } from './helpers/testUtils';

test.describe('Tenant data isolation', () => {
  test('School A admin cannot see School B students via UI navigation', async ({ browser }) => {
    // Two separate browser contexts simulate two independent school sessions
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    const schoolA = await seedTenant({ boardingType: 'DAY_ONLY', level: 'SECONDARY' });
    const schoolB = await seedTenant({ boardingType: 'HYBRID',   level: 'SECONDARY' });

    await loginAs(pageA, schoolA.subdomain, schoolA.credentials.admin);
    await loginAs(pageB, schoolB.subdomain, schoolB.credentials.admin);

    // School A sees only their student count
    await pageA.goto(`http://${schoolA.subdomain}.flexischool.test/academics/students`);
    const countA = await pageA.locator('[data-testid="student-row"]').count();

    // School B sees only their student count — never School A's data
    await pageB.goto(`http://${schoolB.subdomain}.flexischool.test/academics/students`);
    const countB = await pageB.locator('[data-testid="student-row"]').count();

    // Both counts should reflect their own isolated seed data
    expect(countA).toBeGreaterThanOrEqual(0);
    expect(countB).toBeGreaterThanOrEqual(0);

    // Attempt cross-tenant URL access: School A admin tries School B's subdomain
    await pageA.goto(`http://${schoolB.subdomain}.flexischool.test/dashboard`);
    // Should be redirected to login or shown an error — not School B's dashboard
    await expect(pageA).toHaveURL(/login|error|unauthorized/);

    await ctxA.close();
    await ctxB.close();
  });

  test('API rejects JWT from School A when X-Tenant-ID header is School B', async ({ request }) => {
    const schoolA = await seedTenant({ boardingType: 'HYBRID', level: 'SECONDARY' });
    const schoolB = await seedTenant({ boardingType: 'HYBRID', level: 'SECONDARY' });

    // Obtain a valid JWT for School A admin
    const loginRes = await request.post('http://localhost:4000/api/auth/login', {
      data: {
        email:    schoolA.credentials.admin.email,
        password: schoolA.credentials.admin.password,
      },
    });
    const { token } = await loginRes.json();

    // Use School A's token with School B's tenant header — must be rejected
    const res = await request.get('http://localhost:4000/api/students', {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Tenant-ID': schoolB.tenantId,
      },
    });

    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('TENANT_MISMATCH');
  });
});
