import { Inflate, Unzlib } from 'fflate';
import { join, requireBytes } from './binary.ts';

export function decompressBounded(
  compressed: Uint8Array,
  limit: number,
  zlib = false,
): Uint8Array<ArrayBuffer> {
  let size = 0;
  const pieces: Uint8Array[] = [];
  const receive = (chunk: Uint8Array): void => {
    size += chunk.length;
    requireBytes(size <= limit);
    pieces.push(chunk);
  };
  const decoder = zlib ? new Unzlib(receive) : new Inflate(receive);
  for (let p = 0; p < compressed.length; p += 256)
    decoder.push(compressed.subarray(p, p + 256), p + 256 >= compressed.length);
  if (compressed.length === 0) decoder.push(new Uint8Array(), true);
  return join(pieces);
}
