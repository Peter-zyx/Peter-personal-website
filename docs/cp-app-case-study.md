# CP-APP portfolio case study

## Evidence and scope

Prepared on 16 September 2026 from the supplied project record and CP-APP source at
`a4a3ccb7ff8be9c103ca1d4fb5ee66b59d65a128`. The local checkout and remote `main`
were verified to match. The private project record itself is not a portfolio asset.

Primary sources inspected:

- `iosappdev/README.md` and the supplied September 16 project record: implementation status, verification history and limits.
- Git history, including Cici's `c251401` and `e8cc944`: collaboration and frontend / task-reminder contributions.
- `Sources/App/AppModel.swift`, `Sources/UI/WorkspaceView.swift`: native navigation, shared data, refresh and conflict handling.
- `Sources/Domain/Models.swift`, `LifeModels.swift`, `ConversationModels.swift`: task dates, integer-cent accounting, personal authorship and agreement versions.
- `Sources/Domain/AIJournal.swift`: provider protocols, explicit source selection, memory-only credentials and prompt boundaries.
- `Sources/Domain/LocationQuality.swift`, `Sources/App/LocationController.swift` and migration `20260915190000_consensual_location.sql`: independent sharing consent, point freshness, expiry and latest-point storage.
- Native localization resources and tests: English labels, stable storage values and unchanged user content.

The case distinguishes Web Realtime from native foreground polling, local scheduled
reminders from future APNs, factual journals from optional AI, and development
installation from App Store release. Historical test results are described as
recorded evidence, not as a new full regression run or field-validation claim.

## Screenshots

The five English images are **actual SwiftUI views rendered on an iPhone 17
simulator**, using a portfolio-only XCTest harness in an isolated detached worktree.
Original app UI source was not changed. `FakeBackend` supplied fictional Alex / Sam
profiles, tasks, wishes, notes, expenses and a relationship date. No personal account,
real location, model provider or production data was used. The harness asserts zero
backend writes. Its app configuration points to `example.invalid`.

- `home-en.webp`: `WorkspaceView` / Home.
- `tasks-en.webp`: `TaskDetailView`, showing ownership, dates and the feedback entry.
- `ledger-en.webp`: `WorkspaceView` / Ledger.
- `wishes-en.webp`: `WishView`.
- `week-en.webp`: `WeekDetailView`, factual journal and optional AI source controls.
- `public/images/project-icons/cp-app.svg`: original app icon copied without changes from `apps/web/src/app/icon.svg`.

Original captures are 1206 × 2622 pixels. WebP encoding at quality 90 changes only
the format/compression, not the text or interface. Visible content was reviewed;
Vision OCR found no Han-script text in the five published images. Native currency
and calendar semantics are preserved. These are interface illustrations, not a
claim that the fictional events happened or that a live backend test was performed.

The capture harness is retained at `scripts/fixtures/cp-app-portfolio-capture.swift`.
To reproduce, copy it into `iosappdev/Tests/` in an isolated CP-APP checkout at the
commit above; supply dummy client configuration, run XcodeGen and execute only
`CPAppTests/PortfolioCaptureTests` on a fresh simulator. Output paths are printed
with `PORTFOLIO_SCREENSHOT`. Never install preview fixtures into the production app
or seed them into the live database.

## Website implementation

- `src/content/projects/cp-app.md`: archive metadata and supported project claims.
- `src/lib/projectPresentation.ts`: first archive position, original app icon,
  chapter anchors and related projects.
- `src/components/CPAppCase.astro`: dedicated English case study, five-screen
  accessible explorer, design decisions, architecture, collaboration and status.
- `src/pages/projects/[slug].astro`: route integration.

No global navigation, unrelated project pages, or previous About work was redesigned.
The page adds no runtime library. Its explorer supports keyboard arrows, Home/End,
visible focus and a complete no-JavaScript fallback. Motion is limited to optional
short colour transitions.

## Review

Run `SITE_BASE_PATH=/Peter-personal-website npm run build`, start the matching Astro
preview and set `PREVIEW_URL` when running `node scripts/verify-cp-app-preview.mjs`.
The script checks the orbit-to-page flow, five screen tabs and images, keyboard
controls, eight viewport widths, chapter anchors, local asset responses and the
no-JavaScript fallback. Review artifacts are written to `docs/cp-app-review/`.

Final validation on 16 September 2026:

- GitHub Pages base-path production build: 18 routes generated, zero Astro errors.
- Isolated native screenshot test: passed; zero backend writes asserted.
- All five final WebP images: visually reviewed and OCR checked for Chinese text;
  no Han text detected. Total payload is approximately 473 KiB.
- Website: 320–1440 px across eight widths without off-screen elements in the new
  case study; all five tab images decode successfully; keyboard and no-JavaScript
  behaviour pass; no page runtime errors or failing local asset requests.
- CP-APP checkout remains clean. Existing About changes remain intact.
- Publication follows the website’s existing GitHub Pages workflow on `main`.

The existing site build still reports unrelated hints/warnings for the unused
`withBase` import in the electro-piano page, Wulin image URL resolution and the SUV
Three.js bundle size. No new warning was introduced by this case study.
