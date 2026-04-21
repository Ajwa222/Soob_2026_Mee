#!/usr/bin/env node
/**
 * Simulated-user traffic for all 4 onboarding variants.
 *
 * Drives a real browser through each variant's flow via Playwright, capturing
 * every Mixpanel track() POST and every console [track] log along the way.
 * Prints a per-variant summary so you can verify the full funnel is firing.
 *
 * Usage:
 *   # one-time setup
 *   npm install playwright
 *   npx playwright install chromium
 *
 *   # then run — defaults to simba4u.com, 2 runs per variant, headless
 *   node scripts/simulate-variants.mjs
 *
 *   # flags
 *   node scripts/simulate-variants.mjs --url=https://www.simba4u.com --runs=3 --headed
 *
 *   # to run against local dev server
 *   node scripts/simulate-variants.mjs --url=http://localhost:5173
 */
import { chromium } from 'playwright';

// ── args ──
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);
const BASE_URL = args.url || 'https://www.simba4u.com';
const RUNS_PER_VARIANT = Number(args.runs) || 2;
const HEADED = Boolean(args.headed);

const VARIANTS = ['A', 'B', 'C', 'D'];

// ── run one end-to-end walk of a given variant ──
async function walkVariant(browser, variant, runIndex) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const mixpanelPosts = [];
  const consoleTracks = [];

  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('mixpanel.com/track')) {
      mixpanelPosts.push({ url, postData: req.postData()?.slice(0, 200) });
    }
  });
  page.on('console', (msg) => {
    const text = msg.text();
    if (text.startsWith('[track]')) consoleTracks.push(text);
  });

  const url = `${BASE_URL}/?ob=${variant}&debug=1`;
  console.log(`\n─── Variant ${variant} · run ${runIndex + 1}/${RUNS_PER_VARIANT} ───`);
  console.log(`→ ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  // Force-trigger Mixpanel SDK load: dispatch a synthetic pointerdown that our
  // analytics.ts listener is waiting for. Without this, the SDK may not finish
  // loading before the script closes the context and events get lost.
  await page.evaluate(() => {
    window.dispatchEvent(new PointerEvent('pointerdown'));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
  });

  // Give onboarding time to mount AND the Mixpanel SDK time to load + flush the pending queue
  await page.waitForTimeout(2500);

  const isChat = variant === 'C' || variant === 'D';

  try {
    // Language step
    if (isChat) {
      // Chat: click English flag chip
      await page.getByRole('button', { name: /English/i }).first().click();
    } else {
      // Classic: English button
      await page.getByRole('button', { name: /^English$/ }).click();
    }
    await page.waitForTimeout(700);

    // Classic has 2 intro slides; chat goes straight to absher
    if (!isChat) {
      const next = async () => {
        const arrows = await page.locator('button svg[data-lucide="arrow-right"], button:has(svg)').all();
        if (arrows.length) await arrows[arrows.length - 1].click();
      };
      await next();
      await page.waitForTimeout(500);
      await next();
      await page.waitForTimeout(500);
    }

    // Absher: click Yes
    const yesEn = isChat
      ? page.getByRole('button', { name: /Yes, I have Absher/i })
      : page.getByText(/Yes, I have Absher/i);
    await yesEn.click();
    await page.waitForTimeout(1500);

    // /advisor. For A + C, pick "Guide me". For B + D, auto-guide fires.
    if (variant === 'A' || variant === 'C') {
      const guideBtn = page.getByText(/Guide me|Let me guide/i).first();
      await guideBtn.click({ timeout: 5000 }).catch(() => {});
    }
    await page.waitForTimeout(1500);

    // Guide Q&A — answer each step by clicking the first option and Continue
    for (let step = 0; step < 6; step++) {
      // Click the first answer option (usually radio-style card)
      const firstOpt = page.locator('button, [role="button"]').filter({ hasText: /./ }).first();
      await firstOpt.click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(400);
      // Look for a Continue/Next button
      const next = page.getByRole('button', { name: /continue|next|search|find|submit/i });
      if (await next.count()) await next.first().click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(700);
    }

    // Wait for plan cards to appear and click the first one if present
    await page.waitForTimeout(3000);
    const planLinks = await page.locator('a[href^="/plan/"], [data-plan-id]').all();
    if (planLinks.length) {
      await planLinks[0].click().catch(() => {});
      await page.waitForTimeout(1500);

      // Click the "Get this plan" button on plan detail
      const getPlan = page.getByRole('link', { name: /get this plan|get plan/i });
      if (await getPlan.count()) {
        await getPlan.first().click({ timeout: 3000 }).catch(() => {});
      }
    }

    await page.waitForTimeout(1500);
  } catch (err) {
    console.warn(`  ! step failed: ${err.message}`);
  }

  // Let pending Mixpanel XHRs flush before closing the context. Without this
  // wait, the browser terminates in-flight requests and events get lost.
  await page.waitForTimeout(4000);

  // Summarize what fired
  const uniqEvents = new Set();
  for (const line of consoleTracks) {
    const m = line.match(/\[track\] (\S+)/);
    if (m) uniqEvents.add(m[1]);
  }

  console.log(`  ✓ Mixpanel POSTs: ${mixpanelPosts.length}`);
  console.log(`  ✓ Unique events seen: ${uniqEvents.size}`);
  for (const name of Array.from(uniqEvents).sort()) console.log(`      · ${name}`);
  if (!uniqEvents.size) console.log('      (none — likely blocked by onboarding taking too long or SDK not loaded in time)');

  await ctx.close();
  return { variant, events: Array.from(uniqEvents), posts: mixpanelPosts.length };
}

async function main() {
  console.log(`Simulating traffic against: ${BASE_URL}`);
  console.log(`Runs per variant: ${RUNS_PER_VARIANT}`);
  console.log(`Headed mode: ${HEADED}`);

  const browser = await chromium.launch({ headless: !HEADED });

  const summary = [];
  for (const variant of VARIANTS) {
    for (let i = 0; i < RUNS_PER_VARIANT; i++) {
      const result = await walkVariant(browser, variant, i);
      summary.push(result);
    }
  }

  await browser.close();

  console.log('\n═══════════════════════ SUMMARY ═══════════════════════');
  const allEvents = new Set();
  for (const s of summary) s.events.forEach((e) => allEvents.add(e));

  console.log('\nAll unique events seen across all runs:');
  for (const e of Array.from(allEvents).sort()) console.log(`  · ${e}`);

  console.log('\nPer variant:');
  for (const v of VARIANTS) {
    const runs = summary.filter((s) => s.variant === v);
    const totalPosts = runs.reduce((a, b) => a + b.posts, 0);
    const uniqEvents = new Set(runs.flatMap((r) => r.events));
    console.log(`  ${v}: ${runs.length} runs · ${totalPosts} Mixpanel POSTs · ${uniqEvents.size} unique events`);
  }

  console.log('\nNow check Mixpanel → Events → Live View. You should see a burst of events');
  console.log('tagged with onboarding_variant A/B/C/D within the last minute.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
