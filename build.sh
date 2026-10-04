#!/bin/bash
# ======================================================================
# Cisnet Grid IP Scanner2 - Automated Build Script for Unix/Git Bash
# Copyright (c) 2026 Cisnet. All rights reserved.
# ======================================================================

# Text formatting helper
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================================================${NC}"
echo -e "${BLUE}          CISNET GRID IP SCANNER - STANDALONE BUILD SCRIPT            ${NC}"
echo -e "${BLUE}======================================================================${NC}"
echo

# Step 1: Check Node.js
echo -e "${BLUE}[1/4] Checking Node.js environment...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}ERROR: Node.js was not found in your system PATH.${NC}"
    echo "Please install Node.js from https://nodejs.org/ first."
    exit 1
fi
node --version
echo "Node.js is present."
echo

# Step 2: Install dependencies if missing
echo -e "${BLUE}[2/4] Verifying node_modules dependencies...${NC}"
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

# Step 3: Run the build workflow
echo -e "${BLUE}[3/4] Triggering Windows Build Workflow (build-win.js)...${NC}"
npm run build:exe
if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Build workflow failed during execution.${NC}"
    exit 1
fi

# Step 4: Verification
echo
echo -e "${BLUE}[4/4] Verifying generated executable...${NC}"
GEN_EXE=$(find . -maxdepth 1 -name "Grid IP Scanner2 v*.exe" -print -quit)
if [ -n "$GEN_EXE" ]; then
    echo -e "${GREEN}======================================================================${NC}"
    echo -e "${GREEN}SUCCESS: Standalone Windows Executable built!${NC}"
    echo "Filename: $(basename "$GEN_EXE")"
    echo -e "${GREEN}======================================================================${NC}"
    echo
else
    echo -e "${RED}ERROR: Build reported success but versioned executable 'Grid IP Scanner2 v*.exe' was not found.${NC}"
    exit 1
fi
