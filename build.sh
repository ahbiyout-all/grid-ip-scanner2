#!/bin/bash
# ======================================================================
# Grid IP Scanner2 - Automated Multi-Folder Build Script for Unix/Linux
# Copyright (c) 2025-2026 AhBiYout  All rights reserved.
# ======================================================================

# Text formatting helper
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================================================${NC}"
echo -e "${BLUE}     GRID IP SCANNER2 - AUTOMATED MULTI-FOLDER BUILD PIPELINE        ${NC}"
echo -e "${BLUE}======================================================================${NC}"
echo

# Step 1: Check Node.js
echo -e "${BLUE}[1/5] Checking Node.js environment...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}ERROR: Node.js was not found in your system PATH.${NC}"
    echo "Please install Node.js from https://nodejs.org/ first."
    exit 1
fi
node --version
echo "Node.js is present."
echo

# Step 2: Install dependencies if missing
echo -e "${BLUE}[2/5] Verifying node_modules dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    echo "node_modules directory not found. Running dependency installation..."
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}ERROR: 'npm install' failed.${NC}"
        exit 1
    fi
else
    echo "node_modules folder already exists. Skipping npm install."
fi
echo

# Step 3: Synchronize versions
echo -e "${BLUE}[3/5] Synchronizing Semantic Versions...${NC}"
node scripts/sync-version.js
echo

# Step 4: Build web assets and run distribution orchestrator
echo -e "${BLUE}[4/5] Building Web Front-End and packaging distributions...${NC}"
node generate-assets.js
npm run build
node scripts/build-distribution.js
if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Distribution build failed during execution.${NC}"
    exit 1
fi

# Step 5: Verification
echo
echo -e "${BLUE}[5/5] Verifying generated distribution structure...${NC}"
APP_VER=$(node -p "require('./package.json').version" 2>/dev/null || echo "2.3.2")
if [ -d "dist_releases/v${APP_VER}" ]; then
    echo -e "${GREEN}======================================================================${NC}"
    echo -e "${GREEN}SUCCESS: Distribution folders generated under dist_releases/v${APP_VER}/${NC}"
    echo -e "${GREEN}======================================================================${NC}"
    echo
else
    echo -e "${RED}ERROR: dist_releases/v${APP_VER} not found.${NC}"
    exit 1
fi
