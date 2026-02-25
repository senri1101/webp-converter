# Bulk WebP Converter

A toolkit for converting many images to WebP with file-size optimization.

This repository now contains two ways to use the converter:

- CLI mode (Node.js + sharp) for local batch processing
- Web mode (static GitHub Pages app) for browser-based conversion

## Features

- Multi-threaded conversion in CLI mode
- Adjustable quality with optional target-size control
- Optional resize settings per preset
- Batch conversion with directory structure preservation (CLI)
- Browser-based conversion with ZIP export (Web)
- OGP metadata, favicon, and logo for the web app

## Requirements (CLI)

- Node.js 12+
- npm or yarn

## Installation (CLI)

```bash
npm install
```

## CLI Usage

### Preset commands

```bash
npm run convert:high-quality
npm run convert:thumbnail
npm run convert:thumbnail-small
npm run convert:thumbnail-large
npm run convert:ogp
npm run convert:thumbnail-original
```

### Use a custom config

```bash
node convert.js --config=your-config-name
```

### Run multiple configs in one command

```bash
node convert.js --config=thumbnail-1024,original-2048
```

### Available preset summary

| Preset            | Resize       | Quality | Typical usage                     |
| ----------------- | ------------ | ------- | --------------------------------- |
| `high-quality`    | Original     | 80      | Detail view, archive              |
| `thumbnail`       | 300x300      | 70      | List/grid thumbnails              |
| `thumbnail-small` | 200x200      | 65      | Mobile, fast-loading thumbnails   |
| `thumbnail-large` | 512x512      | 75      | Card previews, retina thumbnails  |
| `ogp`             | 1200x630     | 85      | Open Graph share images           |
| `thumbnail-1024`  | 1024x1024    | 25      | Large lightweight thumbnails      |
| `original-2048`   | 2048x2048    | 90      | High-quality export               |

For details, see [CONFIGURATIONS.md](./CONFIGURATIONS.md).

## Web App Usage

The web app lives in `web/` and runs fully client-side.

### Run locally (quick preview)

You can open `web/index.html` directly, or serve the folder with any static server.

### How it works

- Drop or select multiple image files
- Choose a preset (or custom settings)
- Convert to WebP in-browser
- Download each file or export all converted files as ZIP

## GitHub Pages Deployment

This repository includes a workflow:

- `.github/workflows/deploy-pages.yml`

On push to `main` or `master`, it deploys the `web/` directory to GitHub Pages.
The expected public URL is:

- `https://senri1101.github.io/webp-converter/`

### One-time repository setup

1. Open repository settings on GitHub
2. Go to **Pages**
3. Set **Build and deployment** source to **GitHub Actions**

After that, every push to `main` or `master` updates the site.

## Configuration Options (CLI)

| Option           | Description                                            |
| ---------------- | ------------------------------------------------------ |
| `sourceDir`      | Input directory path                                   |
| `outputDir`      | Output directory path                                  |
| `quality`        | Initial WebP quality (0-100)                           |
| `targetSize`     | Target file size in KB (`null` to disable size target) |
| `minQuality`     | Minimum quality allowed while reducing file size       |
| `resize.enabled` | Enable/disable resizing                                |
| `resize.width`   | Max width when resizing                                |
| `resize.height`  | Max height when resizing                               |
| `extensions`     | Source file extensions to process                      |
| `concurrency`    | Number of worker threads                               |

## Notes

- Original files are never overwritten.
- Converted files are written to the configured output directory.
- For large batches, adjust `concurrency` based on memory and CPU capacity.

## Troubleshooting

**Error: `Cannot find module 'sharp'`**
Run:

```bash
npm install
```

**Conversion is slow**
Tune `concurrency` in config files.

**Output files are larger than expected**
Lower `quality`, enable resize, or set a smaller `targetSize`.
