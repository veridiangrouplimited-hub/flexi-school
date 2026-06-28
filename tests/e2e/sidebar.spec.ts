import { test, expect, Browser, Page } from '@playwright/test';
import { seedTenant, loginAs } from './helpers/testUtils';

test.describe('Sidebar adapts to tenant feature flags', () => {
  let page: Page;

  test.beforeEach(async ({ browser }: { browser: Browser }) => {
    page = await browser.newPage();
  });

  test.afterEach(async () => {
    await page.close();
  });

  // ── Boarding type flag tests ──────────────────────────────────────────────

  test('DAY_ONLY school — Hostel nav item is absent', async () => {
    const { subdomain, credentials } = await seedTenant({ boardingType: 'DAY_ONLY' });
    await loginAs(page, subdomain, credentials.admin);

    await page.goto(`http://${subdomain}.flexischool.test/dashboard`);
    await expect(page.locator('nav a[href*="/hostel"]')).toHaveCount(0);
  });

  test('BOARDING_ONLY school — Hostel nav item is present', async () => {
    const { subdomain, credentials } = await seedTenant({ boardingType: 'BOARDING_ONLY' });
    await loginAs(page, subdomain, credentials.admin);

    await page.goto(`http://${subdomain}.flexischool.test/dashboard`);
    await expect(page.locator('nav a[href*="/hostel"]')).toBeVisible();
  });

  test('HYBRID school — Hostel link is visible and navigates correctly', async () => {
    const { subdomain, credentials } = await seedTenant({ boardingType: 'HYBRID' });
    await loginAs(page, subdomain, credentials.admin);

    await page.goto(`http://${subdomain}.flexischool.test/dashboard`);
    const hostelLink = page.locator('nav a[href*="/hostel"]');
    await expect(hostelLink).toBeVisible();
    await hostelLink.click();
    await expect(page).toHaveURL(/\/hostel/);
    await expect(page.locator('h1')).toContainText('Hostel');
  });

  // ── Subscription status tests ─────────────────────────────────────────────

  test('SUSPENDED school — read-only banner shown, save buttons disabled', async () => {
    const { subdomain, credentials } = await seedTenant({
      boardingType: 'HYBRID',
      subStatus:    'SUSPENDED',
    });
    await loginAs(page, subdomain, credentials.admin);

    await page.goto(`http://${subdomain}.flexischool.test/dashboard`);
    await expect(page.locator('[data-testid="readonly-banner"]')).toBeVisible();
    // All mutation buttons should be disabled across the app
    const saveButtons = page.locator('button[data-action="save"]');
    const count = await saveButtons.count();
    for (let i = 0; i < count; i++) {
      await expect(saveButtons.nth(i)).toBeDisabled();
    }
  });

  test('PAST_DUE school — read-only banner shown', async () => {
    const { subdomain, credentials } = await seedTenant({
      boardingType: 'DAY_ONLY',
      subStatus:    'PAST_DUE',
    });
    await loginAs(page, subdomain, credentials.admin);

    await page.goto(`http://${subdomain}.flexischool.test/dashboard`);
    await expect(page.locator('[data-testid="readonly-banner"]')).toBeVisible();
  });

  // ── Role-based nav item tests ─────────────────────────────────────────────

  test('TEACHER role — Settings nav item is hidden', async () => {
    const { subdomain, credentials } = await seedTenant({ boardingType: 'HYBRID' });
    await loginAs(page, subdomain, credentials.teacher);

    await page.goto(`http://${subdomain}.flexischool.test/dashboard`);
    await expect(page.locator('nav a[href*="/settings"]')).toHaveCount(0);
  });

  test('PARENT role — Finance and Settings nav items are hidden', async () => {
    const { subdomain, credentials } = await seedTenant({ boardingType: 'HYBRID' });
    await loginAs(page, subdomain, credentials.parent);

    await page.goto(`http://${subdomain}.flexischool.test/dashboard`);
    await expect(page.locator('nav a[href*="/finance"]')).toHaveCount(0);
    await expect(page.locator('nav a[href*="/settings"]')).toHaveCount(0);
  });
});
