import { expect, test, type Page } from '@playwright/test';

/**
 * Core journeys 1 to 3 from docs/plan/S_TIER_PLAN.md: sign up, bank a story, drill it.
 * Each test signs up a fresh account so tests never share data.
 */

const password = 'E2e-journey-pass-1!';
const uniqueEmail = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

async function signUp(page: Page) {
  await page.goto('/login?mode=signup');
  await page.getByTestId('signin-firstname').fill('Avery');
  await page.getByTestId('signin-lastname').fill('Chen');
  await page.getByTestId('signin-email').fill(uniqueEmail());
  await page.getByTestId('signin-password').fill(password);
  await page.getByTestId('signin-terms').check();
  await page.getByTestId('signin-submit').click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

/** Calls the API from the page so the session cookie and CSRF header match the app's own requests. */
async function apiGet<T>(page: Page, url: string): Promise<T> {
  return page.evaluate(async (u) => {
    const r = await fetch(u, { credentials: 'include', headers: { 'X-Requested-With': 'XMLHttpRequest' } });
    if (!r.ok) throw new Error(`${u} -> ${r.status}`);
    return r.json();
  }, url);
}

test('1. sign up lands on a dashboard with real counts', async ({ page }) => {
  await signUp(page);

  await expect(page.getByRole('heading', { name: /Avery/ })).toBeVisible();
  const stats = await apiGet<{ storyStats: { needsReview: number } }>(page, '/api/dashboard');
  const reviewsTile = page.locator('main a', { hasText: 'Reviews due' });
  await expect(reviewsTile).toContainText(String(stats.storyStats.needsReview));
});

test('2. bank a technical story and find it in the STAR Bank', async ({ page }) => {
  await signUp(page);
  const title = `Idempotent webhook handler ${Date.now()}`;

  await page.goto('/story-bank');
  await page.getByTestId('storybank-new-btn').click();
  await page.locator('#st-title').fill(title);
  await page.locator('#st-code').fill('if (await seen(eventId)) return Ok();');
  await page.locator('#st-explanation').fill(
    'Payment webhooks were retried and charged twice. I stored processed event IDs with a unique index so retries became no-ops.',
  );
  await page.getByRole('button', { name: 'Save story' }).click();

  await expect(page.getByTestId('story-card').filter({ hasText: title })).toBeVisible();
  const stories = await apiGet<{ items: { title: string }[] }>(page, '/api/story?pageSize=100');
  expect(stories.items.map((s) => s.title)).toContain(title);
});

test('3. drill a due story: reveal, rate, and the review is recorded', async ({ page }) => {
  await signUp(page);

  await page.goto('/story-bank/quiz');
  const anyway = page.getByRole('button', { name: 'Practise one anyway' });
  if (await anyway.isVisible().catch(() => false)) await anyway.click();
  const storyTitle = (await page.locator('main h1, h1').first().textContent())?.trim();
  expect(storyTitle).toBeTruthy();

  await page.keyboard.press('r');
  await expect(page.getByTestId('quiz-nailed')).toBeVisible();
  await page.keyboard.press('1');

  // The rated story now has a review time and a next review in the future.
  await expect
    .poll(async () => {
      const all = await apiGet<{ items: { title: string; lastReviewedAt: string | null; nextReviewAt: string | null }[] }>(page, '/api/story?pageSize=100');
      const s = all.items.find((x) => x.title === storyTitle);
      return Boolean(s?.lastReviewedAt && s.nextReviewAt && new Date(s.nextReviewAt) > new Date());
    })
    .toBe(true);
});
