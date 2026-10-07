# VINASIG Metadata Reader

Inspect metadata in images, PDFs, media and Office/ZIP files locally in the browser. Read supported C2PA origin claims and recorded editing actions alongside EXIF and XMP. Filter grouped fields, open original values and export a JSON report. Files are never uploaded, edited or executed. Browser attributes and calculated fingerprints are distinguished from embedded information. Inspection scope and limits appear beside each result.

Use [Metadata Reader](https://metadata.vinasig.io.vn/) in Vietnamese or [English](https://metadata.vinasig.io.vn/en/). Both routes are live over enforced HTTPS. The separate [Metadata Cleaner](https://clean.vinasig.io.vn/) removes supported image metadata without re-encoding. Observed deployment, DNS, repository details and discovery evidence are recorded in the [publication audit](docs/audits/PUBLICATION.md).

Read [behavior and limits](docs/PRODUCT.md). Missing fields do not prove an absence of identifying data. Private manufacturer tags, encrypted files, old PDF revisions, Office contents and hidden pixel data are not exhaustively inspected. Unknown formats receive basic fingerprint/signature information with an explicit basic-only scope.

Use Node 24.21.0 and npm 12.2.0. Install the locked dependencies, then run npm run check, npm test, npm run build, npm run test:browser and npm run test:performance. npm run dev starts development and npm run preview serves static output. Pinned Playwright browsers are required for browser checks. Evidence is stored in ignored output/.

The project adopts [VINASIG Agent Standards](docs/STANDARDS.md), reviewed shared chrome and unchanged original artwork/fonts. Software uses AGPL-3.0-or-later, prose CC-BY-SA-4.0, fonts OFL-1.1 and marks the separate [brand policy](BRAND_POLICY.md). Dependencies retain their notices. See [license scopes](LICENSES.md). Inputs and reports retain their own rights.

System defaults and shared deliberate theme/language choices follow [the ecosystem preference contract](docs/LOCALIZATION.md). Active work is preserved when another tab changes language.
