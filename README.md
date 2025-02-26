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

1. `convert.js`ファイル内の設定を必要に応じて変更します:

```javascript
const config = {
  sourceDir: './images', // 変換元の画像があるディレクトリ
  outputDir: './images_webp', // 変換後のWebP画像を保存するディレクトリ
  quality: 80, // WebPの品質 (0-100)
  targetSize: 20, // 目標サイズ (KB)
  minQuality: 40, // 最小品質
  resize: {
    enabled: false, // リサイズ機能の有効/無効
    width: 1200, // 最大幅
    height: 630 // 最大高さ (OGP画像用の一般的なアスペクト比は1.91:1)
  },
  extensions: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff'], // 変換対象の拡張子
  concurrency: Math.max(1, cpus().length - 1) // 並列処理数
};
```

2. スクリプトを実行します:

```bash
npm start
# または
node convert.js
```

## 設定オプション

| オプション | 説明 |
|------------|------|
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

## OGP画像としての最適化

OGP（Open Graph Protocol）画像として使用する場合、以下の設定が推奨されます:

```javascript
resize: {
  enabled: true,
  width: 1200,
  height: 630
}
```

これは一般的なOGP画像の推奨サイズである1200×630ピクセル（アスペクト比1.91:1）に合わせています。

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
