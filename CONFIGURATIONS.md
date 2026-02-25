# WebP Configuration Guide

This document describes the available WebP conversion presets and how to customize them.

## Preset Overview

### 1. High Quality (Original Size)

**Use case:** Detail views, zoom views, archives

```javascript
const config = {
  sourceDir: "./assets", // input directory
  outputDir: "./assets_webp", // output directory
  quality: 80, // initial WebP quality (0-100)
  targetSize: 200, // target file size in KB
  minQuality: 80, // minimum quality threshold
  resize: {
    enabled: false, // keep original resolution
    width: 1200,
    height: 630,
  },
  extensions: [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".svg"],
  concurrency: Math.max(1, cpus().length - 1),
};
```

**Highlights:**

- Preserves original dimensions and aspect ratio
- High visual quality (`quality: 80`)
- No resize step
- Typical size reduction around 93%

---

### 2. Thumbnail (Lightweight 300x300)

**Use case:** List views, grid views, gallery pages

```javascript
const config = {
  sourceDir: "./assets", // input directory
  outputDir: "./assets_webp_thumbnail", // output directory
  quality: 70,
  targetSize: 50,
  minQuality: 60,
  resize: {
    enabled: true,
    width: 300,
    height: 300,
  },
  extensions: [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".svg"],
  concurrency: Math.max(1, cpus().length - 1),
};
```

**Highlights:**

- Resizes up to 300x300 while preserving aspect ratio
- Balanced quality and size
- Typical average file size around 6 KB
- Typical reduction around 99%

---

## Other Preset Examples

### 3. Ultra Lightweight Thumbnail (200x200)

**Use case:** Mobile-heavy screens, aggressive performance targets

```javascript
const config = {
  quality: 65,
  targetSize: 30,
  minQuality: 55,
  resize: {
    enabled: true,
    width: 200,
    height: 200,
  },
};
```

---

### 4. High Quality Thumbnail (512x512)

**Use case:** Card previews, medium-sized previews, retina assets

```javascript
const config = {
  quality: 75,
  targetSize: 100,
  minQuality: 65,
  resize: {
    enabled: true,
    width: 512,
    height: 512,
  },
};
```

---

### 5. OGP Image (1200x630)

**Use case:** Open Graph images for social sharing

```javascript
const config = {
  quality: 85,
  targetSize: 300,
  minQuality: 75,
  resize: {
    enabled: true,
    width: 1200,
    height: 630,
  },
};
```

---

### 6. Large Thumbnail (1024x1024)

**Use case:** Large thumbnails and lightweight preview assets

```javascript
const config = {
  quality: 25,
  targetSize: null, // fixed quality, no target-size adjustment
  minQuality: 25,
  resize: {
    enabled: true,
    width: 1024,
    height: 1024,
  },
};
```

---

### 7. Original Export (2048x2048)

**Use case:** High-quality output for larger displays

```javascript
const config = {
  quality: 90,
  targetSize: null, // fixed quality, no target-size adjustment
  minQuality: 90,
  resize: {
    enabled: true,
    width: 2048,
    height: 2048,
  },
};
```

---

## Usage

### Method 1: Run preset commands (recommended)

```bash
npm run convert:high-quality
npm run convert:thumbnail
npm run convert:thumbnail-small
npm run convert:thumbnail-large
npm run convert:ogp
npm run convert:thumbnail-original
```

### Method 2: Run with a specific config name

```bash
node convert.js --config=your-config-name
```

### Method 3: Run multiple configs in one command

```bash
node convert.js --config=thumbnail-1024,original-2048
```

### Method 4: Edit existing config files

1. Edit files in `configs/` (for example `configs/thumbnail.json`)
2. Update `sourceDir` and `outputDir` for your environment
3. Execute the related command

### Method 5: Create a new config file

1. Create a new JSON file under `configs/` (example: `my-config.json`)
2. Use the format below

```json
{
  "name": "My Preset Name",
  "description": "Preset description",
  "sourceDir": "./assets",
  "outputDir": "./assets_output",
  "quality": 80,
  "targetSize": 200,
  "minQuality": 70,
  "resize": {
    "enabled": false,
    "width": 1200,
    "height": 630
  },
  "extensions": [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".svg"]
}
```

3. Run:

```bash
node convert.js --config=my-config
```

## Parameter Reference

| Parameter       | Description                                      | Typical Range |
| --------------- | ------------------------------------------------ | ------------- |
| `quality`       | Initial quality used for WebP output             | 60-90         |
| `targetSize`    | Target file size in KB                           | 30-200        |
| `minQuality`    | Lower bound for quality reduction                | 55-80         |
| `resize.width`  | Max width when resizing                          | 200-1200      |
| `resize.height` | Max height when resizing                         | 200-1200      |

Note: `fit: "inside"` is used internally, so aspect ratio is preserved.
