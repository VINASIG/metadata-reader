import { PDFDocument } from 'pdf-lib';
import { zipSync, strToU8 } from 'fflate';
import { privateText } from './fixtures.ts';
import { exifFixture } from './fixtures.ts';
import { join, view } from '../src/lib/binary.ts';
export function jxlFixture(): Uint8Array<ArrayBuffer> {
  const tiff = exifFixture();
  const box = new Uint8Array(12 + tiff.length);
  view(box).setUint32(0, box.length);
  box.set(strToU8('Exif'), 4);
  box.set(tiff, 12);
  return join([
    new Uint8Array([0, 0, 0, 12, 74, 88, 76, 32, 13, 10, 135, 10]),
    box,
  ]);
}
export function officeFixture(): Uint8Array<ArrayBuffer> {
  return new Uint8Array(
    zipSync({
      '[Content_Types].xml': strToU8('<Types/>'),
      'docProps/core.xml': strToU8(
        `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:creator>${privateText}</dc:creator></cp:coreProperties>`,
      ),
      'word/document.xml': strToU8('<document/>'),
    }),
  );
}
export async function pdfFixture(): Promise<Uint8Array<ArrayBuffer>> {
  const pdf = await PDFDocument.create();
  pdf.addPage([100, 100]);
  pdf.setAuthor(privateText);
  pdf.setTitle('Metadata fixture');
  pdf.setCreationDate(new Date('2026-01-01T00:00:00Z'));
  return new Uint8Array(await pdf.save());
}
export function wavFixture(): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(48);
  const d = new DataView(bytes.buffer);
  bytes.set(strToU8('RIFF'));
  d.setUint32(4, 40, true);
  bytes.set(strToU8('WAVEfmt '), 8);
  d.setUint32(16, 16, true);
  d.setUint16(20, 1, true);
  d.setUint16(22, 1, true);
  d.setUint32(24, 8000, true);
  d.setUint32(28, 16000, true);
  d.setUint16(32, 2, true);
  d.setUint16(34, 16, true);
  bytes.set(strToU8('data'), 36);
  d.setUint32(40, 4, true);
  return bytes;
}
