#!/bin/bash

# Color palette
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}"
echo "----------------------------------------------"
echo "  Bulk WebP Converter - Setup Script          "
echo "----------------------------------------------"
echo -e "${NC}"

# Check Node.js
echo -e "${YELLOW}Checking Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed.${NC}"
    echo "Please install it from https://nodejs.org/."
    exit 1
fi

# Show Node.js version
NODE_VERSION=$(node -v)
echo -e "${GREEN}Found Node.js ${NODE_VERSION}${NC}"

# Create required directories
echo -e "${YELLOW}Creating directories...${NC}"
mkdir -p assets
mkdir -p assets_webp

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install

echo ""
echo -e "${GREEN}Setup completed.${NC}"
echo -e "Usage:"
echo -e "1. Put source image files into the ${BLUE}assets${NC} directory"
echo -e "2. Adjust conversion settings in ${BLUE}convert.js${NC} if needed"
echo -e "3. Run conversion with:"
echo -e "   ${YELLOW}npm start${NC} or ${YELLOW}node convert.js${NC}"
echo ""
echo -e "Converted WebP files are saved in ${BLUE}assets_webp${NC}"
