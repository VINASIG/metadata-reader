import ExifReader from 'exifreader';
import { DOMParser, onErrorStopParsing } from '@xmldom/xmldom';
import { ascii } from './binary.ts';
import { decompressBounded } from './inflate.ts';

export interface Entry {
  key: string;
  value: string;
}
export interface Metadata {
  format: string;
  fields: Entry[];
  scope: 'image' | 'pdf' | 'audio' | 'archive' | 'basic';
  warnings: string[];
}
export function flatten(
  value: unknown,
  prefix = '',
  out: Entry[] = [],
  depth = 0,
): Entry[] {
  if (out.length >= 5000 || depth > 12 || value === undefined || value === null)
    return out;
  if (value instanceof Date) {
    out.push({ key: prefix, value: value.toISOString() });
    return out;
  }
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    out.push({
      key: prefix.slice(0, 512),
      value: String(value).slice(0, 8192),
    });
    return out;
  }
  if (value instanceof Uint8Array || value instanceof ArrayBuffer) {
    out.push({
      key: prefix,
      value: `${String(value instanceof ArrayBuffer ? value.byteLength : value.length)} bytes`,
    });
    return out;
  }
  if (Array.isArray(value)) {
    if (value.length > 64) {
      out.push({ key: prefix, value: `${String(value.length)} items` });
      return out;
    }
    for (const [i, item] of value.entries())
      flatten(item, `${prefix}[${String(i)}]`, out, depth + 1);
  } else if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record['description'] === 'string') {
      flatten(record['description'], prefix, out, depth + 1);
    } else
      for (const [key, item] of Object.entries(record)) {
        if (
          key === 'base64' ||
          key === 'image' ||
          key === 'buffer' ||
          key === '_raw'
        )
          continue;
        flatten(item, prefix ? `${prefix}.${key}` : key, out, depth + 1);
      }
  }
  return out;
}
export function imageFormat(bytes: Uint8Array): string {
  if (bytes[0] === 255 && bytes[1] === 216) return 'JPEG';
  if (ascii(bytes, 1, 4) === 'PNG') return 'PNG';
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP')
    return 'WebP';
  if (ascii(bytes, 0, 3) === 'GIF') return 'GIF';
  if (['II', 'MM'].includes(ascii(bytes, 0, 2))) return 'TIFF';
  if (ascii(bytes, 4, 8) === 'ftyp') return ascii(bytes, 8, 12);
  if (
    (bytes[0] === 255 && bytes[1] === 10) ||
    (ascii(bytes, 4, 8) === 'JXL ' &&
      bytes[8] === 13 &&
      bytes[9] === 10 &&
      bytes[10] === 135 &&
      bytes[11] === 10)
  )
    return 'JPEG XL';
  return 'Unknown';
}
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
  const tags = await ExifReader.load(bytes.buffer, {
    expanded: true,
    async: true,
    includeUnknown: true,
    domParser: new DOMParser({ onError: onErrorStopParsing }),
    decompress: { maxDecompressedSize: 8 * 1024 * 1024 },
  });
  return {
    format: imageFormat(bytes),
    fields: flatten(tags),
    scope: 'image',
    warnings: [],
  };
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
