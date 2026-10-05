import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { startServer } from '../../scripts/serve.ts';
import {
  inspectInterface,
  inspectControlSurfaces,
  inspectControlIndicators,
  inspectHeaderBrand,
} from '../../.vinasig/standards/templates/web/interface.mjs';
import { inspectSiteChrome } from '../../.vinasig/standards/templates/web/site-chrome.mjs';

import { capture } from './evidence.ts';

let app: Awaited<ReturnType<typeof startServer>>;
test.beforeAll(async () => {
  app = await startServer(path.resolve('dist'));
  await mkdir('output/responsive', { recursive: true });
});
test.afterAll(async () => {
  await app.close();
});
async function guards(page: Page): Promise<void> {
  expect(await page.evaluate(inspectInterface)).toEqual([]);
  expect(await page.evaluate(inspectControlSurfaces)).toEqual([]);
  expect(await page.evaluate(inspectControlIndicators)).toEqual([]);
  expect(await page.evaluate(inspectHeaderBrand)).toEqual([]);
  expect(await page.evaluate(inspectSiteChrome)).toEqual([]);
  expect(await page.locator('header[data-site-header]').count()).toBe(1);
  expect(await page.locator('footer[data-site-footer]').count()).toBe(1);
  expect(await page.locator('input[type=file]').count()).toBe(1);
  expect(await page.locator('summary').count()).toBeGreaterThan(0);
}
for (const lang of ['vi', 'en'] as const) {
  test(`responsive chrome, copy, controls and accessibility ${lang}`, async ({
    page,
  }, info) => {
    await page.goto(app.url + (lang === 'en' ? 'en/' : ''));
    for (const dark of [false, true]) {
      if (dark) await page.locator('[data-theme-toggle]').click();
      for (const [width, height] of [
        [320, 800],
        [360, 800],
        [390, 844],
        [759, 1024],
        [760, 1024],
        [761, 1024],
        [768, 1024],
        [1024, 768],
        [1280, 900],
        [1440, 900],
      ]) {
        await page.setViewportSize({
          width: width ?? 320,
          height: height ?? 800,
        });
        await guards(page);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await page.locator('footer').scrollIntoViewIfNeeded();
        await capture(
          page,
          info,
          `${lang}-${dark ? 'dark' : 'light'}-${String(width)}-footer`,
        );
        await page.locator('h1').scrollIntoViewIfNeeded();
        await capture(
          page,
          info,
          `${lang}-${dark ? 'dark' : 'light'}-${String(width)}`,
        );
      }
      const axe = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(axe.violations).toEqual([]);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    await guards(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await capture(page, info, `${lang}-text-200`, true);
  });
  test(`initial HTML remains meaningful without JavaScript ${lang}`, async ({
    browser,
  }, info) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 320, height: 800 },
      colorScheme: 'dark',
    });
    const page = await context.newPage();
    await page.goto(app.url + (lang === 'en' ? 'en/' : ''));
    await expect(page.locator('#file')).toBeDisabled();
    await guards(page);
    expect(
      await page
        .locator('[data-brand-logo] img')
        .evaluate(
          (img) =>
            img instanceof HTMLImageElement &&
            img.currentSrc.endsWith('reversed.svg'),
        ),
    ).toBe(true);
    await capture(page, info, `${lang}-no-script`, true);
    await context.close();
  });
}
