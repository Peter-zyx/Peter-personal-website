# Yuxuan Zhou — Portfolio

Personal design and engineering portfolio, built with Astro and Three.js.

Live site: https://peter-zyx.github.io/Peter-personal-website/

## Local development

Use Node.js 20 or later.

```sh
npm ci
npm run dev
```

## Build and preview

```sh
npm run build
npm run preview
```

To check the GitHub Pages subpath locally:

```sh
SITE_BASE_PATH=/Peter-personal-website npm run build
SITE_BASE_PATH=/Peter-personal-website npm run preview
```

## Publishing updates

Push changes to `main`. The GitHub Actions workflow builds the site and publishes
`dist/` to GitHub Pages automatically. Pages uses the **GitHub Actions** source.

Project content lives in `src/content/projects/`, page components in
`src/components/`, and downloadable files and media in `public/`.
The website's CV download is `public/cv/yuxuan-zhou-cv.pdf`.

The deployment base is applied to rendered links by `src/middleware.ts`.
Browser-generated site URLs use the `withBase` helper in `src/lib/paths.ts`.
