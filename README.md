# Bulk WebP Image Converter

このツールは複数の画像を効率的にWebP形式に変換するNode.jsスクリプトです。WebPは優れた圧縮率を提供する画像形式で、ウェブサイトのパフォーマンス向上に役立ちます。

## 主な機能

- 複数のCPUコアを活用した並列処理
- ターゲットサイズに合わせた自動品質調整
- 複数の画像形式（JPG, PNG, GIF, BMP, TIFF）に対応
- ディレクトリ構造を維持したバッチ変換
- 必要に応じた画像リサイズ機能
- 詳細な変換レポート（圧縮率、サイズ削減など）

## 要件

- Node.js (v12以上推奨)
- NPM または Yarn

## インストール方法

1. リポジトリをクローンまたはダウンロードします
2. 依存関係をインストールします:

```bash
npm install
# または
yarn install
```

## 使用方法

### 方法1: 設定ファイルを使った変換（推奨）

設定ファイルを指定して変換を実行できます。

```bash
# 高品質版（元サイズ維持）で変換
npm run convert:high-quality

# サムネイル版（300x300px）で変換
npm run convert:thumbnail

# 超軽量サムネイル版（200x200px）で変換
npm run convert:thumbnail-small

# 高品質サムネイル版（512x512px）で変換
npm run convert:thumbnail-large

# OGP画像用（1200x630px）で変換
npm run convert:ogp
```

### 方法2: カスタム設定ファイルを使用

```bash
node convert.js --config=設定ファイル名
```

### 利用可能な設定一覧

| 設定名 | サイズ | 品質 | 用途 |
| -------　|　--------　|　------　|　------　|
| `high-quality` | 元サイズ維持 | 80% | 詳細表示、アーカイブ |
| `thumbnail` | 300x300px | 70% | リスト・グリッド表示 |
| `thumbnail-small` | 200x200px | 65% | モバイル、超高速読み込み |
| `thumbnail-large` | 512x512px | 75% | カード表示、Retina対応 |
| `ogp` | 1200x630px | 85% | SNSシェア用OGP画像 |

詳細は [CONFIGURATIONS.md](./CONFIGURATIONS.md) を参照してください。

### 方法3: 設定ファイルをカスタマイズ

`configs/` ディレクトリ内の設定ファイルを編集できます。

例: `configs/thumbnail.json`

```json
{
  "name": "サムネイル版（300px）",
  "description": "リスト表示、グリッド表示、一覧ページ用",
  "sourceDir": "./assets",
  "outputDir": "./assets_webp_thumbnail",
  "quality": 70,
  "targetSize": 50,
  "minQuality": 60,
  "resize": {
    "enabled": true,
    "width": 300,
    "height": 300
  }
}
```

## 設定オプション

| オプション | 説明 |
|　------------　|　------　|
| `sourceDir` | 変換元の画像が格納されているディレクトリのパス |
| `outputDir` | 変換後のWebP画像を保存するディレクトリのパス |
| `quality` | WebP変換の初期品質設定 (0-100) |
| `targetSize` | 目標ファイルサイズ (KB) |
| `minQuality` | 許容する最低品質値 |
| `resize.enabled` | 画像リサイズ機能の有効/無効 |
| `resize.width` | リサイズする最大幅 |
| `resize.height` | リサイズする最大高さ |
| `extensions` | 変換対象とするファイル拡張子の配列 |
| `concurrency` | 同時に実行する変換プロセスの数 |

## 変換結果の例

実際の変換結果（57ファイル）:

### 高品質版（元サイズ維持）

- 元サイズ: 35.05 MB
- 変換後: 2.56 MB
- 削減率: **92.71%**
- 処理時間: 2.40秒

### サムネイル版（300x300px）

- 元サイズ: 35.05 MB
- 変換後: 0.35 MB
- 削減率: **99.01%**
- 平均ファイルサイズ: 6.14 KB
- 処理時間: 1.26秒

## OGP画像としての最適化

OGP（Open Graph Protocol）画像として使用する場合は、`ogp` 設定を使用してください:

```bash
npm run convert:ogp
```

一般的なOGP画像の推奨サイズである1200×630ピクセル（アスペクト比1.91:1）に最適化されます。

## 注意事項

- 大量の画像を処理する場合、十分なメモリを確保してください
- 元の画像は変更されません。変換結果は別のディレクトリに保存されます
- 最適な結果を得るには、`quality`と`targetSize`の値を調整してください

## トラブルシューティング

**エラー: 'Error: Cannot find module 'sharp''**  
依存関係が正しくインストールされていません。`npm install`を実行してください。

**処理が遅い場合**  
`concurrency`の値を調整して、より多くのCPUコアを利用するか、または少なくしてメモリ使用量を減らしてください。

**ファイルサイズが目標より大きい場合**  
`quality`の値を下げるか、リサイズ機能を有効にしてください。
