import { test, expect, Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@careercode.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!';

test.describe('Admin Calendar — /admin/calendar', () => {
  test.setTimeout(180000);

  async function loginAdmin(page: Page) {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#email', { timeout: 30000 });
    await dismissTours(page);
    await page.fill('#email', ADMIN_EMAIL);
    await page.fill('#password', ADMIN_PASSWORD);
    await page.locator('form button[type="submit"]').click();
    await page.waitForFunction(
      () => !window.location.pathname.startsWith('/login'),
      null,
      { timeout: 90000 }
    );
  }

  async function dismissTours(page: Page) {
    for (let i = 0; i < 5; i++) {
      const dialog = page.getByRole('dialog');
      if (!(await dialog.count())) break;
      const skip = dialog.getByRole('button', { name: /Skip|Got it|Done|Close/i }).last();
      if (!(await skip.count())) break;
      await skip.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(300);
    }
  }

  async function openCalendar(page: Page) {
    await page.goto('/admin/calendar', { waitUntil: 'domcontentloaded' });
    await dismissTours(page);
    await page.waitForTimeout(1500);
    if (page.url().includes('/login')) {
      test.skip(true, 'Not authenticated as admin — skipping admin calendar test.');
      return;
    }
    await expect(page.getByRole('heading', { name: /Event Management/i })).toBeVisible({ timeout: 30000 });
  }

  test('page loads with header, Create button and stat cards', async ({ page }) => {
    await loginAdmin(page);
    await openCalendar(page);

    await expect(page.getByRole('heading', { name: /Event Management/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Event' })).toBeVisible();
    for (const label of ['Total', 'Scheduled', 'Live', 'Completed', 'Cancelled', 'Draft']) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }
  });

  test('full lifecycle: create, search, edit, view, delete', async ({ page }) => {
    await loginAdmin(page);
    await openCalendar(page);

    const title = `E2E Test Event ${Date.now()}`;
    const renamed = `${title} (renamed)`;

    // ── Create ──
    await page.getByRole('button', { name: 'Create Event' }).first().click();
    const createModal = page.locator('body > div.fixed.inset-0').last();
    await expect(createModal.getByRole('heading', { name: 'Create Event' })).toBeVisible();
    await createModal.getByPlaceholder('Event title').fill(title);
    await createModal.getByPlaceholder('Event description').fill('Created by Playwright e2e test');
    const dtInputs = createModal.locator('input[type="datetime-local"]');
    await dtInputs.nth(0).fill('2026-12-01T10:00');
    await dtInputs.nth(1).fill('2026-12-01T11:00');
    await createModal.getByRole('button', { name: 'Create Event' }).click();

    await expect(page.getByText(title, { exact: true }).first()).toBeVisible({ timeout: 30000 });
    await expect(createModal).toBeHidden({ timeout: 15000 });

    // ── Search ──
    const search = page.getByPlaceholder('Search events...');
    await search.fill(title);
    await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
    await search.fill('__never_matches_zzz__');
    await expect(page.getByText('No events found')).toBeVisible({ timeout: 10000 });
    await search.fill('');

    // ── Edit ──
    const row = page.locator('tr', { hasText: title }).first();
    await row.getByTitle('Edit').click();
    const editModal = page.locator('body > div.fixed.inset-0').last();
    await expect(editModal.getByRole('heading', { name: 'Edit Event' })).toBeVisible();
    await expect(editModal.getByDisplayValue(title)).toBeVisible();
    await editModal.getByDisplayValue(title).fill(renamed);
    await editModal.getByRole('button', { name: 'Update Event' }).click();
    await expect(page.getByText(renamed, { exact: true }).first()).toBeVisible({ timeout: 30000 });

    // ── View ──
    const renamedRow = page.locator('tr', { hasText: renamed }).first();
    await renamedRow.getByTitle('View').click();
    const detailModal = page.locator('body > div.fixed.inset-0').last();
    await expect(detailModal.getByRole('heading', { name: renamed })).toBeVisible({ timeout: 15000 });
    await expect(detailModal.getByRole('button', { name: /Going/ })).toBeVisible();
    await expect(detailModal.getByRole('button', { name: /Maybe/ })).toBeVisible();
    await detailModal.getByRole('button', { name: /Going/ }).click();
    await page.waitForTimeout(1500);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // ── Delete (cleanup) ──
    await page.getByText(renamed, { exact: true }).first().locator('xpath=ancestor::tr').getByTitle('Delete').click();
    await page.getByRole('button', { name: 'Delete' }).last().click();
    await expect(page.getByText(renamed, { exact: true }).first()).toBeHidden({ timeout: 15000 });
  });
});