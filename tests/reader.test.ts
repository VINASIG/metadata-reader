import assert from 'node:assert/strict';
import { test } from 'node:test';

import { zipSync, strToU8, zlibSync } from 'fflate';
import { decompressBounded } from '../src/lib/inflate.ts';
import { readMetadata, flatten } from '../src/lib/metadata.ts';
import { readArchive } from '../src/lib/archive.ts';
import { pngFixture, privateText } from './fixtures.ts';

import {
  officeFixture,
  pdfFixture,
  wavFixture,
  jxlFixture,
} from './reader-fixtures.ts';
await test('JPEG XL container metadata reaches the image parser', async () => {
  const bytes = jxlFixture();
  const before = bytes.slice();
  const result = await readMetadata(bytes);
  assert.equal(result.scope, 'image');
  assert.equal(result.format, 'JPEG XL');
  assert(JSON.stringify(result.fields).includes(privateText));
  assert.deepEqual(bytes, before);
});
await test('image reader decodes private EXIF without changing input', async () => {
  const bytes = pngFixture();
  const original = bytes.slice();
  const result = await readMetadata(bytes);
  assert.equal(result.scope, 'image');
  assert(JSON.stringify(result.fields).includes(privateText));
  assert.deepEqual(bytes, original);
});
await test('PDF reader finds standard author and creation date', async () => {
  const bytes = await pdfFixture();
  const original = bytes.slice();
  const result = await readMetadata(bytes);
  assert.equal(result.format, 'PDF');
  assert(
    result.fields.some(
      (e) => e.key === 'PDF.Author' && e.value === privateText,
    ),
  );
  assert(
    result.fields.some(
      (e) =>
        e.key === 'PDF.CreationDate' && e.value === '2026-01-01T00:00:00.000Z',
    ),
  );
  assert.deepEqual(bytes, original);
});
await test('Office properties and archive directory are distinct inspected fields', () => {
  const result = readArchive(officeFixture());
  assert.equal(result.format, 'Office ZIP');
  assert(
    result.fields.some(
      (e) => e.key.endsWith('dc:creator') && e.value === privateText,
    ),
  );
  assert(result.fields.some((e) => e.key.startsWith('ZIP.entry')));
});
await test('archive truncation and corrupt directory offsets are rejected', () => {
  const bytes = officeFixture();
  assert.throws(() => readArchive(bytes.subarray(0, bytes.length - 3)));
  const corrupted = bytes.slice();
  new DataView(corrupted.buffer).setUint32(
    corrupted.length - 6,
    0xffffffff,
    true,
  );
  assert.throws(() => readArchive(corrupted));
});
await test('oversized Office property streams are not expanded', () => {
  const bytes = new Uint8Array(
    zipSync({ 'docProps/core.xml': strToU8('x'.repeat(3 * 1024 * 1024)) }),
  );
  const result = readArchive(bytes);
  assert(result.warnings.includes('property-limit'));
  assert.equal(result.fields.length, 1);
});
await test('stream inflation stops when a forged expanded-size budget is exceeded', () => {
  const compressed = zlibSync(strToU8('x'.repeat(1024 * 1024)));
  assert.throws(() => decompressBounded(compressed, 1024, true));
  const small = strToU8('bounded XML');
  assert.deepEqual(decompressBounded(zlibSync(small), 1024, true), small);
});
await test('WAV codec properties use the media parser', async () => {
  const result = await readMetadata(wavFixture());
  assert.equal(result.scope, 'audio');
  assert(
    result.fields.some(
      (e) => e.key === 'format.sampleRate' && e.value === '8000',
    ),
  );
});
await test('unknown format explicitly reports basic coverage and a fingerprint', async () => {
  const result = await readMetadata(strToU8('A plain text fixture'));
  assert.equal(result.scope, 'basic');
  assert(result.warnings.includes('unsupported'));
  assert.match(
    result.fields.find((e) => e.key === 'SHA-256')?.value ?? '',
    /^[a-f0-9]{64}$/,
  );
});
await test('field rendering input stays bounded and preserves data as text', () => {
  const result = flatten({
    Author: '<img src=x onerror=alert(1)>',
    Long: 'a'.repeat(12000),
    Date: new Date('2026-01-01T00:00:00Z'),
  });
  assert.equal(
    result.find((e) => e.key === 'Author')?.value,
    '<img src=x onerror=alert(1)>',
  );
  assert.equal(result.find((e) => e.key === 'Long')?.value.length, 8192);
  assert.equal(
    result.find((e) => e.key === 'Date')?.value,
    '2026-01-01T00:00:00.000Z',
  );
});
