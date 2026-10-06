# Public deployment observations, 6 October 2026

The owner approved two separate public projects, GitHub publication, custom domains, DNS, Search Console, repository details and website/profile synchronization. This audit records observed results for the first deployment. Later commits must still pass their own CI and expose the expected source-revision metadata before a new delivery claim.

## Repository and deployment

VINASIG/metadata-reader is public on main. Its verified signed source revision is 9f4d1a250d5c8f7c3b7c4960bc5a705b7543e16e. [CI and deployment run 37389760239](https://github.com/VINASIG/metadata-reader/actions/runs/37389760239) completed successfully, including source, unit, build, three-engine browser, shared-chrome and applicable performance checks on the configured Ubuntu/Windows matrix.

Repo details were set immediately after creation and read back. The initial homepage pointed to the repository README until the canonical HTTPS site was verified. The current homepage is https://metadata.vinasig.io.vn/. The English description states local inspection, searchable fields and JSON reports for supported images, PDFs, media and Office/ZIP files. Topics are astro, audio, browser-tools, exif, metadata, office, pdf, privacy, vinasig and zip.

Pages uses workflow deployment, cname metadata.vinasig.io.vn, an approved certificate and enforced HTTPS. Cloudflare contains the verified DNS-only CNAME metadata pointing to vinasig.github.io with TTL Auto. Local, public resolver and dashboard observations agree.

## Live browser verification

The root, /en/, robots.txt and sitemap.xml return HTTPS 200 at the canonical host. Both HTML routes expose source revision 9f4d1a250d5c8f7c3b7c4960bc5a705b7543e16e. Robots declares the exact sitemap, whose parsed URLs are the root and /en/ routes. Canonical, hreflang, language, shared brand/header/footer and control inspection pass for both locales and themes at 320 and 1440 CSS pixels.

Synthetic PNG, PDF, DOCX, JPEG XL and WAV fixtures were read through the deployed worker. Expected fields, search/no-result recovery, JSON report contents and clearing the file/results all passed. No external file-processing requests or JavaScript errors were observed. The reports disclose partial format coverage. These integration checks do not establish exhaustive inspection of arbitrary files.

The real Chrome page was visually reviewed. The original VINASIG header logo was activated and reached https://vinasig.io.vn/. Live screenshots and detailed JSON reports remain in ignored output/publication directories. Personal files were not used.

## Discovery and standards

The exact sitemap was submitted under the existing sc-domain:vinasig.io.vn property. The first sitemap-report fetch failed. Google live URL inspection at 07:03 local time then reported crawl allowed Yes and page fetch Successful. The same sitemap was resubmitted once after that result, and the submission success dialog was observed. At the next report observation the earlier fetch error remained. This is separate from the successful live fetch and does not establish completed sitemap processing or indexing. The report should be checked for the provider's subsequent crawl outcome.

Agent Standards commit bc72ee25ac18e7847eb2c7f8cdd8a57e3164e92e is pushed with successful source/installer and web-fixture CI. CORE-009 now requires immediate description, homepage and topics setup plus readback for every new repository, including private and source-only projects. The reviewed snapshot used here is recorded in .vinasig/provenance.json.

The main website inventory update is pushed at VINASIG/vinasig commit 6952a38419c47fe68773ab32d176b7749b798f47. Its own final CI and live validation are post-commit evidence. Both organization profile languages are pushed at VINASIG/.github commit 0ca5171eac525281a615935ebc78c44cb22609ba. The actual public English profile and rendered Vietnamese counterpart were opened and verified with the correct tool/source destinations.

Production indexing, field metrics, physical-device or screen-reader certification and exhaustive independent security review are NOT_RUN. Implementation limits remain those in PRODUCT.md. Private dashboard captures and account context are excluded from source publication.
