import { test, expect } from '@playwright/test';
import { seedTenant, loginAs } from './helpers/testUtils';

test.describe('Report Card generation', () => {
  test('Teacher can generate and preview a student report card', async ({ page }) => {
    const { subdomain, credentials } = await seedTenant({
      boardingType: 'DAY_ONLY',
      level: 'SECONDARY',
    });
    await loginAs(page, subdomain, credentials.teacher);

    // Navigate to results module
    await page.goto(`http://${subdomain}.flexischool.test/academics/results`);
    await expect(page.locator('h1')).toContainText('Results');

    // Select class and term
    await page.selectOption('[data-testid="class-select"]',  { label: 'JSS 1 Gold' });
    await page.selectOption('[data-testid="term-select"]',   { label: 'First Term' });
    await page.click('[data-testid="load-results"]');

    // Select first student and generate report card
    await page.click('[data-testid="student-row"]:first-child [data-testid="view-report"]');

    // Verify report card content sections are present
    await expect(page.locator('[data-testid="report-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="report-summary"]')).toBeVisible();
    await expect(page.locator('[data-testid="subject-results"]')).toBeVisible();

    // Each subject row must have grade and remark columns
    const rows = page.locator('[data-testid="subject-row"]');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i).locator('[data-col="grade"]')).not.toBeEmpty();
      await expect(rows.nth(i).locator('[data-col="remark"]')).not.toBeEmpty();
    }
  });

  test('Print layout hides sidebar and navigation chrome', async ({ page }) => {
    const { subdomain, credentials } = await seedTenant({ boardingType: 'DAY_ONLY' });
    await loginAs(page, subdomain, credentials.admin);

    await page.goto(`http://${subdomain}.flexischool.test/academics/results/report/test-student-id`);

    // Emulate print media to verify @media print rules
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('aside')).toBeHidden();
    await expect(page.locator('header')).toBeHidden();
    await expect(page.locator('[data-testid="report-card"]')).toBeVisible();
  });
});
