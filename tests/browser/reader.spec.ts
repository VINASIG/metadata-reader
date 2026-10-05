import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { startServer } from '../../scripts/serve.ts';
import { pngFixture, privateText } from '../fixtures.ts';
import {
  pdfFixture,
  officeFixture,
  wavFixture,
  jxlFixture,
} from '../reader-fixtures.ts';
import { capture } from './evidence.ts';

let app: Awaited<ReturnType<typeof startServer>>;
test.beforeAll(async () => {
  app = await startServer(path.resolve('dist'));
});
test.afterAll(async () => {
  await app.close();
});

test('image, PDF, Office and audio metadata work locally in the browser worker', async ({
  page,
}, info) => {
  const errors: string[] = [];
  const external: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => {
    if (
      !r.url().startsWith(app.url) &&
      !r.url().startsWith('blob:') &&
      !r.url().startsWith('data:')
    )
      external.push(r.url());
  });
  const fixtures = [
    { name: 'private.png', bytes: pngFixture(), text: privateText },
    { name: 'private.pdf', bytes: await pdfFixture(), text: privateText },
    { name: 'private.docx', bytes: officeFixture(), text: privateText },
    { name: 'private.jxl', bytes: jxlFixture(), text: privateText },
    { name: 'audio.wav', bytes: wavFixture(), text: '8000' },
  ];
  for (const fixture of fixtures) {
    await page.goto(app.url);
    await expect(page.locator('#file')).toBeEnabled();
    await page.locator('#file').setInputFiles({
      name: fixture.name,
      mimeType: 'application/octet-stream',
      buffer: Buffer.from(fixture.bytes),
    });
    await expect(page.locator('#result')).toBeVisible();
    await expect(page.locator('#metadata-fields')).toContainText(fixture.text);
    await expect(page.locator('#process')).toHaveCount(0);
    await page.locator('#search').fill(fixture.text);
    await expect(page.locator('#metadata-fields')).toContainText(fixture.text);
    await page.locator('#search').fill('not-a-real-metadata-value');
    await expect(page.locator('#metadata-fields dt')).toHaveCount(0);
    await page.locator('#search').fill('');
    const pending = page.waitForEvent('download');
    await page.locator('#report').click();
    const download = await pending;
    expect(download.suggestedFilename()).toBe('metadata-report.json');
    const downloaded = await download.path();
    if (!downloaded) throw new Error('Missing report');
    const data = await readFile(downloaded, 'utf8');
    expect(data).toContain(fixture.text);
    expect(data).toContain('"scope"');
    await capture(page, info, fixture.name, true);
    await page.locator('#clear').click();
    await expect(page.locator('#result')).toBeHidden();
    await expect(page.locator('#file')).toHaveValue('');
  }
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test('unsupported signatures disclose basic scope and malformed PDFs fail safely', async ({
  page,
}) => {
  await page.goto(app.url + 'en/');
  await page.locator('#file').setInputFiles({
    name: 'file.bin',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from('plain bytes'),
  });
  await expect(page.locator('#result')).toBeVisible();
  await expect(page.locator('#coverage')).toContainText('Basic information');
  await expect(page.locator('#metadata-fields')).toContainText('SHA-256');
  await page.locator('#file').setInputFiles({
    name: 'invalid.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-invalid'),
  });
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'error');
  await expect(page.locator('#result')).toBeHidden();
});

test('HTML-looking metadata remains plain text and never loads remote content', async ({
  page,
}) => {
  const { PDFDocument } = await import('pdf-lib');
  const pdf = await PDFDocument.create();
  pdf.setAuthor(
    '<img src="https://example.invalid/secret" onerror="alert(1)">',
  );
  await page.goto(app.url);
  const remote: string[] = [];
  page.on('request', (r) => {
    if (!r.url().startsWith(app.url)) remote.push(r.url());
  });
  await page.locator('#file').setInputFiles({
    name: 'untrusted.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(await pdf.save()),
  });
  await expect(page.locator('#metadata-fields')).toContainText('<img src=');
  await expect(page.locator('#metadata-fields img')).toHaveCount(0);
  expect(remote).toEqual([]);
});
