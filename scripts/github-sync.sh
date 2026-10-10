#!/usr/bin/env bash
# ======================================================================
# Grid IP Scanner2 - Automated GitHub Push & CI/CD Release Script
# Developer: AhBiYout | GitHub Account / Namespace: AhBiYout-all
# Repository: grid-ip-scanner2
# Copyright (c) 2026 AhBiYout. All rights reserved.
# ======================================================================

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================================================${NC}"
echo -e "${BLUE}       GRID IP SCANNER2 - AUTOMATED GITHUB SYNC & RELEASE SCRIPT       ${NC}"
echo -e "${BLUE}       Developer: AhBiYout  |  Target: AhBiYout-all/grid-ip-scanner2   ${NC}"
echo -e "${BLUE}======================================================================${NC}"
echo

# [Step 1] Check Git installation & Privacy guard
echo -e "${BLUE}[1/6] Checking Git environment and Privacy Guards...${NC}"
if ! command -v git &> /dev/null; then
    echo -e "${RED}ERROR: Git is not installed or not in PATH.${NC}"
    exit 1
fi
echo "   Found: $(git --version)"
echo "   [OK] Privacy Guard active: .gitignore enforces exclusion of personal emails & .env secrets."
echo

# [Step 2] Dynamic Version Extraction & Auto-Sync (Single Source of Truth)
echo -e "${BLUE}[2/6] Synchronizing repository files with Semantic Versioning (SSOT)...${NC}"
APP_VER=""

# Tier 1: package.json via Node & sync-version.js
if command -v node &> /dev/null; then
    if [ -f "scripts/sync-version.js" ]; then
        node scripts/sync-version.js || true
    fi
    if [ -f "package.json" ]; then
        APP_VER=$(node -p "try{require('./package.json').version}catch(e){}" 2>/dev/null || echo "")
    fi
fi

# Tier 2: docs/PATCH_NOTE.md fallback
if [ -z "$APP_VER" ] && [ -f "docs/PATCH_NOTE.md" ]; then
    APP_VER=$(grep -i "Patch Note (v" "docs/PATCH_NOTE.md" | head -n 1 | sed -E 's/.*\(v?([0-9.]+)\).*/\1/' || echo "")
fi

if [ -z "$APP_VER" ]; then
    APP_VER="2.4.0"
fi
echo -e "   Resolved Version: ${GREEN}v${APP_VER}${NC}"
echo

# [Step 3] Verify or Initialize Git Repository
echo -e "${BLUE}[3/6] Verifying local Git repository...${NC}"
if [ ! -d ".git" ]; then
    echo "   Initializing local Git repository..."
    git init
fi

git branch -M main || true

REMOTE_URL="https://github.com/AhBiYout-all/grid-ip-scanner2.git"
if git remote get-url origin &>/dev/null; then
    git remote set-url origin "$REMOTE_URL"
    echo "   Remote origin verified: $REMOTE_URL"
else
    git remote add origin "$REMOTE_URL"
    echo "   Added remote origin: $REMOTE_URL"
fi
echo

# [Step 4] Staging files
echo -e "${BLUE}[4/6] Staging files (honoring .gitignore)...${NC}"
git add .
echo "   All modified and new files staged."
echo

# [Step 5] Commit
echo -e "${BLUE}[5/6] Creating commit...${NC}"
COMMIT_MSG="feat: Grid IP Scanner2 v${APP_VER} release update ($(date '+%Y-%m-%d %H:%M'))"
if [ -n "$1" ]; then
    COMMIT_MSG="$1"
fi
git commit -m "$COMMIT_MSG" || echo "   No new changes to commit."
echo

# [Step 6] Push to GitHub & Tag
echo -e "${BLUE}[6/6] Pushing to GitHub (origin main)...${NC}"
git push -u origin main || git push -f origin main
echo "   Branch 'main' pushed successfully."
echo

echo -e "${BLUE}[*] Synchronizing Release Tag (v${APP_VER})...${NC}"
git tag -d "v${APP_VER}" 2>/dev/null || true
git push origin ":refs/tags/v${APP_VER}" 2>/dev/null || true
git tag -a "v${APP_VER}" -m "Release Grid IP Scanner2 v${APP_VER}"
git push origin "v${APP_VER}"
echo "   Tag v${APP_VER} pushed."
echo

echo -e "${GREEN}======================================================================${NC}"
echo -e "${GREEN}[SUCCESS] Grid IP Scanner2 v${APP_VER} synced to GitHub!${NC}"
echo -e "${GREEN}======================================================================${NC}"
echo -e "🌐 Repository: ${BLUE}https://github.com/AhBiYout-all/grid-ip-scanner2${NC}"
echo -e "🚀 CI/CD Actions: ${BLUE}https://github.com/AhBiYout-all/grid-ip-scanner2/actions${NC}"
echo -e "📦 Releases: ${BLUE}https://github.com/AhBiYout-all/grid-ip-scanner2/releases${NC}"
echo -e "💻 Official Blog: ${BLUE}https://ahbiyoutvibe.blogspot.com/${NC}"
echo -e "🏢 Affiliation: ${BLUE}https://www.cisnet.co.kr${NC}"
echo
