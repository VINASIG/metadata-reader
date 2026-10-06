import { ascii } from './binary.ts';
import { decompressBounded } from './inflate.ts';
import { flatten } from './fields.ts';
import type { Metadata } from './fields.ts';
import { imageFormat, readImageMetadata } from './image-metadata.ts';
export { flatten } from './fields.ts';
export type { Entry, Metadata } from './fields.ts';
export async function readMetadata(
  bytes: Uint8Array<ArrayBuffer>,
): Promise<Metadata> {
  if (ascii(bytes, 0, 5) === '%PDF-') return readPdf(bytes);
  if (ascii(bytes, 0, 2) === 'PK') {
    const { readArchive } = await import('./archive.ts');
    return readArchive(bytes);
  }
  const format = imageFormat(bytes);
  const brands = ascii(bytes, 8, 12);
  const isImage =
    format !== 'Unknown' &&
    (ascii(bytes, 4, 8) !== 'ftyp' ||
      /^(avif|avis|heic|heix|hevc|hevx|heim|heis|hevm|hevs|mif1|msf1)$/.test(
        brands,
      ));
  if (!isImage) {
    const audio =
      ['ID3', 'fLaC', 'OggS', 'RIFF', 'FORM'].some(
        (magic) => ascii(bytes, 0, magic.length) === magic,
      ) ||
      ascii(bytes, 4, 8) === 'ftyp' ||
      (bytes[0] === 255 && ((bytes[1] ?? 0) & 224) === 224);
    if (audio) {
      const { parseBuffer } = await import('music-metadata');
      const tags = await parseBuffer(bytes, undefined, {
        skipCovers: true,
        duration: false,
      });
      return {
        format: tags.format.container ?? 'Media',
        fields: flatten({
          format: tags.format,
          common: tags.common,
          native: tags.native,
        }),
        scope: 'audio',
        warnings: tags.quality.warnings.map((w) => w.message),
      };
    }
    const digest = [
      ...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
    ]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('');
    return {
      format: 'Unknown',
      fields: [
        { key: 'SHA-256', value: digest },
        {
          key: 'Signature',
          value: Array.from(bytes.subarray(0, 32), (x) =>
            x.toString(16).padStart(2, '0'),
          ).join(' '),
        },
      ],
      scope: 'basic',
      warnings: ['unsupported'],
    };
  }
  return readImageMetadata(bytes);
}
async function readPdf(bytes: Uint8Array<ArrayBuffer>): Promise<Metadata> {
  const { PDFDocument, PDFName, PDFRawStream, PDFArray } =
    await import('pdf-lib');
  const pdf = await PDFDocument.load(bytes, {
    updateMetadata: false,
    throwOnInvalidObject: true,
  });
  const values = {
    Title: pdf.getTitle(),
    Author: pdf.getAuthor(),
    Subject: pdf.getSubject(),
    Keywords: pdf.getKeywords(),
    Creator: pdf.getCreator(),
    Producer: pdf.getProducer(),
    CreationDate: pdf.getCreationDate(),
    ModificationDate: pdf.getModificationDate(),
    Pages: pdf.getPageCount(),
  };
  const fields = flatten(values, 'PDF');
  const warnings: string[] = [];
  const metadata = pdf.context.lookup(pdf.catalog.get(PDFName.of('Metadata')));
  if (metadata instanceof PDFRawStream) {
    try {
      if (metadata.contents.length > 2 * 1024 * 1024)
        throw new Error('XMP size limit');
      const filter = pdf.context.lookup(
        metadata.dict.get(PDFName.of('Filter')),
      );
      const filters =
        filter instanceof PDFArray
          ? filter.asArray().map((item) => pdf.context.lookup(item))
          : filter
            ? [filter]
            : [];
      if (
        filters.length > 1 ||
        filters.some(
          (item) =>
            !(item instanceof PDFName) ||
            !['/FlateDecode', '/Fl'].includes(item.toString()),
        )
      )
        throw new Error('Unsupported XMP stream filter');
      const decoded = filters.length
        ? decompressBounded(metadata.contents, 8 * 1024 * 1024, true)
        : metadata.contents;
      if (decoded.length > 8 * 1024 * 1024)
        throw new Error('XMP expanded size limit');
      const xml = new TextDecoder().decode(decoded);
      fields.push({ key: 'PDF.XMP', value: xml.slice(0, 8192) });
    } catch {
      warnings.push('xmp-limit');
    }
  }
  return { format: 'PDF', fields, scope: 'pdf', warnings };
}
