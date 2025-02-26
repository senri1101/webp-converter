#!/bin/bash

# 色の定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# バナーを表示
echo -e "${BLUE}"
echo "----------------------------------------------"
echo "  WebP一括変換ツール - セットアップスクリプト  "
echo "----------------------------------------------"
echo -e "${NC}"

# Node.jsがインストールされているか確認
echo -e "${YELLOW}Node.jsの確認中...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.jsがインストールされていません。${NC}"
    echo "https://nodejs.org/からインストールしてください。"
    exit 1
fi

# Node.jsのバージョンを確認
NODE_VERSION=$(node -v)
echo -e "${GREEN}Node.js $NODE_VERSION が見つかりました${NC}"

# 必要なディレクトリの作成
echo -e "${YELLOW}ディレクトリの作成中...${NC}"
mkdir -p images
mkdir -p images_webp

# 依存関係のインストール
echo -e "${YELLOW}依存関係のインストール中...${NC}"
npm install

echo ""
echo -e "${GREEN}セットアップが完了しました！${NC}"
echo -e "使用方法:"
echo -e "1. ${BLUE}images${NC} ディレクトリに変換したい画像ファイルを配置してください"
echo -e "2. 必要に応じて ${BLUE}convert.js${NC} の設定を編集してください"
echo -e "3. 以下のコマンドを実行して変換を開始します:"
echo -e "   ${YELLOW}npm start${NC} または ${YELLOW}node convert.js${NC}"
echo ""
echo -e "変換後のWebP画像は ${BLUE}images_webp${NC} ディレクトリに保存されます"
