# Metadata Reader

Inspect one file at a time in browser memory. No file is uploaded, modified, executed or persisted. Vietnamese is at root and English at /en/. Both themes reuse VINASIG chrome, tokens, icons and a local font. The companion cleaner handles supported images.

ExifReader reads supported JPEG, PNG, WebP, GIF, TIFF, HEIC, AVIF and JPEG XL metadata. EXIF, GPS, IPTC, XMP, ICC, image details and private manufacturer tags depend on parser coverage. Embedded thumbnails, links and scripts are not loaded. Missing tags do not prove an absence of private information.

PDF inspection reads current standard document properties and catalog XMP through pdf-lib. Encrypted files may fail. Old incremental revisions, annotations, attachments, scripts and all private properties are not exhaustively scanned. Audio and MP4 use music-metadata for codec/container and common/native tags, with embedded cover decoding disabled. This is not complete video forensics.

ZIP and Office inspection reads the central directory, filenames, byte sizes, DOS date/time, comments and encryption flags. Selected core, application and custom property XML files are decompressed within a 2 MiB budget and parsed as text. Office content, tracked changes, comments, attachments and macros are not exhaustively inspected or run. Legacy binary DOC/XLS/PPT and ZIP64 are unsupported specialized formats. Unknown formats receive a SHA-256 fingerprint and a bounded signature, with basic-only scope shown.

Browser name, MIME hint and lastModified are displayed separately. Extensions and MIME hints do not override signatures. Files are bounded to 100 MiB. Workers stop after 20 seconds and on reset, replacement or page hide. Nesting, expanded XML, field count and directory entries are bounded. Values are capped at 8192 characters and 5000 fields. They are displayed with textContent and remain searchable. Reports retain the scope and limits and require an explicit download action.

Controls include a native file trigger, buttons, search and disclosures. Checkbox, radio, dropdown, calendar, color and range controls are not applicable. Native semantics, scrollbars and forced colors remain operable. Without scripts the file control stays disabled with an explanation. Static hosting requests still reach the provider, while file connections and form submissions are blocked by CSP.
