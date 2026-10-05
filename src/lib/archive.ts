import { DOMParser, onErrorStopParsing } from '@xmldom/xmldom';
import { requireBytes, view } from './binary.ts';
import { decompressBounded } from './inflate.ts';
import type { Entry, Metadata } from './metadata.ts';
const LIMIT = 2 * 1024 * 1024;
export function readArchive(bytes: Uint8Array): Metadata {
  const d = view(bytes);
  let end = -1;
  for (let p = bytes.length - 22; p >= Math.max(0, bytes.length - 65557); p--) {
    if (
      d.getUint32(p, true) === 0x06054b50 &&
      p + 22 + d.getUint16(p + 20, true) === bytes.length
    ) {
      end = p;
      break;
    }
  }
  requireBytes(
    end >= 0 &&
      d.getUint16(end + 4, true) === 0 &&
      d.getUint16(end + 6, true) === 0,
  );
  const count = d.getUint16(end + 10, true);
  const centralSize = d.getUint32(end + 12, true);
  const central = d.getUint32(end + 16, true);
  requireBytes(
    count <= 10000 && count !== 65535 && central + centralSize <= end,
  );
  const fields: Entry[] = [];
  let p = central;
  let isOffice = false;
  const warnings: string[] = [];
  const comment = bytes.subarray(end + 22);
  if (comment.length)
    fields.push({
      key: 'ZIP.comment',
      value: new TextDecoder().decode(comment).slice(0, 8192),
    });
  for (let i = 0; i < count; i++) {
    requireBytes(p + 46 <= end && d.getUint32(p, true) === 0x02014b50);
    const flags = d.getUint16(p + 8, true);
    const method = d.getUint16(p + 10, true);
    const compressedSize = d.getUint32(p + 20, true);
    const expandedSize = d.getUint32(p + 24, true);
    const nameLength = d.getUint16(p + 28, true);
    const extraLength = d.getUint16(p + 30, true);
    const commentLength = d.getUint16(p + 32, true);
    const offset = d.getUint32(p + 42, true);
    const next = p + 46 + nameLength + extraLength + commentLength;
    requireBytes(next <= central + centralSize && nameLength <= 4096);
    const name = new TextDecoder().decode(
      bytes.subarray(p + 46, p + 46 + nameLength),
    );
    const fileComment = new TextDecoder().decode(
      bytes.subarray(p + 46 + nameLength + extraLength, next),
    );
    fields.push({
      key: `ZIP.entry[${String(i)}]`,
      value: JSON.stringify({
        name,
        compressedBytes: compressedSize,
        expandedBytes: expandedSize,
        encrypted: Boolean(flags & 1),
        method,
        dosTime: d.getUint16(p + 12, true),
        dosDate: d.getUint16(p + 14, true),
        comment: fileComment.slice(0, 4096),
      }),
    });
    if (name === '[Content_Types].xml') isOffice = true;
    if (
      [
        'docProps/core.xml',
        'docProps/app.xml',
        'docProps/custom.xml',
        'meta.xml',
      ].includes(name)
    ) {
      if (
        flags & 1 ||
        expandedSize > LIMIT ||
        compressedSize > LIMIT ||
        ![0, 8].includes(method)
      ) {
        warnings.push('property-limit');
        p = next;
        continue;
      }
      requireBytes(
        offset + 30 <= central && d.getUint32(offset, true) === 0x04034b50,
      );
      const start =
        offset +
        30 +
        d.getUint16(offset + 26, true) +
        d.getUint16(offset + 28, true);
      requireBytes(start + compressedSize <= central);
      const compressed = bytes.subarray(start, start + compressedSize);
      const xml =
        method === 8 ? decompressBounded(compressed, LIMIT) : compressed;
      requireBytes(xml.length === expandedSize);
      const document = new DOMParser({
        onError: onErrorStopParsing,
      }).parseFromString(new TextDecoder().decode(xml), 'application/xml');
      const nodes = document.getElementsByTagName('*');
      requireBytes(nodes.length <= 5000);
      for (let j = 0; j < nodes.length; j++) {
        const node = nodes.item(j);
        if (node && node.childNodes.length <= 1 && node.textContent?.trim())
          fields.push({
            key: `${name}.${node.tagName}`,
            value: node.textContent.slice(0, 8192),
          });
      }
    }
    p = next;
  }
  requireBytes(p === central + centralSize);
  return {
    format: isOffice ? 'Office ZIP' : 'ZIP',
    fields: fields.slice(0, 5000),
    scope: 'archive',
    warnings,
  };
}
