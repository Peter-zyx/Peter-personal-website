# Faust portfolio integration

The project carousel and Experience section link to `/projects/faust-light-system/`.
The internship is Product Designer, September–30 November 2026, remote, with
San Francisco headquarters and a Shenzhen office. Evidence is dated through
29 September 2026; the page identifies the internship as ongoing.

## Content and evidence

- The case follows brief, light language, animation iteration, privacy diagnostics,
  Light Lab, F2 optical modelling, and engineering handover.
- Images and videos are derived from the supplied Faust work: the clear-dome
  Ready study, physical prototype reference, Week 3 conversation/capture sequences,
  Week 4 diagnostics, and Week 5 F2 geometry and Model Lab preview.
- Privacy evidence comprises 112 layout renders and 48 diagnostic renders.
- F2 contains 8 conditional layouts, 22 Speos solves and 5 solved distances.
  The interactive basis is W45_N12_G10 only. Assumed geometry/materials and the
  555 nm proxy are explicitly distinguished from measured hardware performance.
- The original work folders remain unchanged. Source snapshots in this repository
  make the public apps reproducible without a dependency on those local folders.

## Web applications

Light Lab source lives in `integrations/faust-light-lab`. Vite builds it into the
ignored `public/apps/faust-light-lab` directory. Both `npm run dev` and
`npm run build` run that build automatically. Assets use a relative Vite base,
so the app works on GitHub Pages under the repository subpath.

Model Lab is a standalone static application in `public/apps/faust-model-lab`.
Its original F2 calculation engine and worker are retained. `preview.html` is a
compact UI using the same engine and data, with sampled preview curves; the full
app retains the 0.5 ms calculations and CSV exports. English is the default language.

Both in-page apps load only after the visitor presses Launch. Closing a preview
removes its iframe. Full applications, A/B review and reports have separate links.

## Local verification

```powershell
npm ci
npm run test:faust
$env:SITE_BASE_PATH='/Peter-personal-website'
npm run build
npm run preview -- --host 127.0.0.1 --port 4322
```

The 36 tests cover light state transitions, privacy precedence, supported zone
counts, F2 superposition, the complete sequence export, and validation boundaries.
Browser checks cover the carousel, internship entry, both interactive embeds,
full Model Lab playback, and mobile layouts.

The geometry comparison is a responsive vector diagram driven by
`src/data/faust-f2-geometry.json`, copied from the F2 study configuration.

Pushing to `main` triggers the existing Deploy to GitHub Pages workflow. It builds
both the website and Light Lab, then publishes `dist` under `/Peter-personal-website`.
