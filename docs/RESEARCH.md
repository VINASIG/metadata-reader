# Format and parser research

Reviewed on 6 October 2026. The format editor operates on container bytes and does not use a Canvas encoder, image codec or lossy transform.

- [W3C PNG Third Edition](https://www.w3.org/TR/png-3/) defines chunk layout, CRC, critical/ancillary bits, EXIF, color management, transparency and APNG. IDAT and fdAT compressed content remains unchanged. Color/HDR and animation chunks remain required for this preservation-oriented tool.
- [Google WebP RIFF container specification](https://developers.google.com/speed/webp/docs/riff_container) defines VP8X metadata flags, size, EXIF, XMP, ICC and animated frame structures. Removing EXIF/XMP needs an updated header and RIFF size.
- [JPEG JFIF 1.02](https://www.w3.org/Graphics/JPEG/jfif3.pdf) defines density, thumbnail and color interpretation. The cleaner retains a minimal JFIF display header.
- [CIPA Exif specifications](https://www.cipa.jp/e/std/std-sec.html) govern TIFF/EXIF orientation, color-space and interoperability tags. Only required display values are rewritten. Proprietary offsets and MakerNotes are never copied into minimal EXIF.
- [GIF89a specification](https://www.w3.org/Graphics/GIF/spec-gif89a.txt) distinguishes comments, graphic control, application and rendered plain text extensions.
- [ExifReader](https://github.com/mattiasw/ExifReader) provides decoded tags from its documented image formats. Supported decoding is not evidence of complete manufacturer-specific inspection. ArrayBuffer input is used instead of a URL. It retains its MPL-2.0 rights and upstream notices.

No metadata-only tool can guarantee that an image carries no useful identifying information. Required color data, visual content and pixel-level traces remain explicit limits. Container payload equality and browser decode tests establish image preservation for the tested fixtures. They are not a universal security certification.

Reader-specific primary sources are the [pdf-lib API](https://pdf-lib.js.org/docs/api/classes/pdfdocument) for current document properties and catalog objects, [music-metadata](https://github.com/Borewit/music-metadata) for local buffer parsing, and [fflate](https://github.com/101arrowz/fflate) for streaming deflate/zlib decoding. No PDF save method is called by the reader. Compressed XMP is expanded incrementally with a hard output budget; unsupported stream filters produce a coverage warning. ZIP properties are read within the declared and actual expanded-size limits, and metadata XML is never executed.
