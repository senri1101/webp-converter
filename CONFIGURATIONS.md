# WebP変換設定集

このファイルには、用途別のWebP変換設定を記録しています。

## 設定一覧

### 1. 元サイズ版（高品質）

**用途:** 詳細表示、拡大表示、アーカイブ用

```javascript
const config = {
  sourceDir: "./assets", // 変換元ディレクトリ
  outputDir: "./assets_webp", // 出力先ディレクトリ
  quality: 80, // WebP品質 (0-100)
  targetSize: 200, // 目標ファイルサイズ (KB)
  minQuality: 80, // 最低品質
  resize: {
    enabled: false, // リサイズ無効
    width: 1200,
    height: 630,
  },
  extensions: [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".svg"],
  concurrency: Math.max(1, cpus().length - 1),
};
```

**特徴:**

- 元の画像サイズとアスペクト比を維持
- 高品質（quality 80%）
- リサイズなし
- 平均削減率: 約93%

**実績例（アプリデザイン変換）:**

- 元サイズ: 35.05 MB
- 変換後: 2.56 MB
- 削減率: 92.71%
- ファイル数: 57ファイル

---

### 2. サムネイル版（軽量）

**用途:** リスト表示、グリッド表示、一覧ページ

```javascript
const config = {
  sourceDir: "./assets", // 変換元ディレクトリ
  outputDir: "./assets_webp_thumbnail", // 出力先ディレクトリ
  quality: 70, // WebP品質 (0-100)
  targetSize: 50, // 目標ファイルサイズ (KB)
  minQuality: 60, // 最低品質
  resize: {
    enabled: true, // リサイズ有効
    width: 300, // 最大幅 300px
    height: 300, // 最大高さ 300px
  },
  extensions: [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".svg"],
  concurrency: Math.max(1, cpus().length - 1),
};
```

**特徴:**

- 最大300x300pxにリサイズ（アスペクト比維持）
- 中品質（quality 70%）
- 平均ファイルサイズ: 約6KB
- 平均削減率: 約99%

**実績例（アプリデザイン変換）:**

- 元サイズ: 35.05 MB
- 変換後: 0.35 MB (350 KB)
- 削減率: 99.01%
- ファイル数: 57ファイル
- 平均ファイルサイズ: 6.14 KB

---

## その他の設定例

### 3. 超軽量サムネイル（200x200px）

**用途:** モバイルアプリのリスト表示、超高速読み込みが必要な場合

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

### 4. 高品質サムネイル（512x512px）

**用途:** カード表示、中サイズプレビュー、Retinaディスプレイ対応

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

### 5. OGP画像用

**用途:** SNSシェア用のOGP画像（推奨サイズ: 1200x630px）

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

### 6. サムネイル版（1024x1024px）

**用途:** 大きめのサムネイル、一覧・拡大プレビュー兼用

```javascript
const config = {
  quality: 25,
  targetSize: null, // サイズ目標は使わず品質固定
  minQuality: 25,
  resize: {
    enabled: true,
    width: 1024,
    height: 1024,
  },
};
```

---

### 7. オリジナル版（2048x2048px）

**用途:** 高品質のオリジナル書き出し

```javascript
const config = {
  quality: 90,
  targetSize: null, // サイズ目標は使わず品質固定
  minQuality: 90,
  resize: {
    enabled: true,
    width: 2048,
    height: 2048,
  },
};
```

---

## 使い方

### 方法1: 設定ファイルを使った変換（推奨）

設定ファイルを指定して変換を実行できます。

```bash
# 高品質版で変換
npm run convert:high-quality

# サムネイル版（300px）で変換
npm run convert:thumbnail

# 超軽量サムネイル版（200px）で変換
npm run convert:thumbnail-small

# 高品質サムネイル版（512px）で変換
npm run convert:thumbnail-large

# OGP画像用で変換
npm run convert:ogp

# 1024pxサムネ + 2048pxオリジナルを一括で生成
npm run convert:thumbnail-original

# カスタム設定ファイルを使用
node convert.js --config=your-config-name

# 複数設定を一括で実行
node convert.js --config=thumbnail-1024,original-2048
```

### 方法2: 設定ファイルをカスタマイズする

1. `configs/` ディレクトリ内の設定ファイル（例: `thumbnail.json`）を編集
2. `sourceDir` と `outputDir` を適切なパスに変更
3. 上記のコマンドで実行

### 方法3: 新しい設定ファイルを作成する

1. `configs/` ディレクトリに新しいJSONファイルを作成（例: `my-config.json`）
2. 以下の形式で設定を記述

```json
{
  "name": "設定名",
  "description": "説明",
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

3. `node convert.js --config=my-config` で実行

### 利用可能な設定一覧を確認

```bash
# 存在しない設定名を指定すると、利用可能な設定一覧が表示されます
node convert.js --config=list
```

## パラメータ説明

| パラメータ      | 説明                       | 推奨値   |
| --------------- | -------------------------- | -------- |
| `quality`       | WebP変換時の初期品質       | 60-90    |
| `targetSize`    | 目標ファイルサイズ（KB）   | 30-200   |
| `minQuality`    | 許容する最低品質           | 55-80    |
| `resize.width`  | リサイズ時の最大幅（px）   | 200-1200 |
| `resize.height` | リサイズ時の最大高さ（px） | 200-1200 |

**Note:** `resize` の `fit: "inside"` により、アスペクト比は常に維持されます。
