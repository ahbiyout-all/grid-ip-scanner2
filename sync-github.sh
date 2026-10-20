#!/usr/bin/env bash
# ==============================================================================
# Grid IP Scanner2 - Automated GitHub Synchronization & Deployment Pipeline
# Script: sync-github.sh
# Author: AhBiYout | Org: AhBiYout-all | Cisnet (www.cisnet.co.kr)
# Target Repo: https://github.com/AhBiYout-all/grid-ip-scanner2
# ==============================================================================

set -eo pipefail

# ANSI Color Codes
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BOLD='\033[1m'

echo -e "${CYAN}======================================================================${NC}"
echo -e "${BOLD}   GRID IP SCANNER2 - AUTOMATED GITHUB REPOSITORY SYNC PIPELINE       ${NC}"
echo -e "   Developer: AhBiYout  |  Target: AhBiYout-all/grid-ip-scanner2       "
echo -e "${CYAN}======================================================================${NC}"
echo ""

# ------------------------------------------------------------------------------
# 1. Environment Verification
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[1/6] Verifying Git and Node.js toolchains...${NC}"

if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Error: 'git' command not found in PATH.${NC}"
    echo "Please install Git or make sure it is added to your environment PATH."
    exit 1
fi
echo -e "  ${GREEN}✔${NC} Git detected: $(git --version)"

if command -v node &> /dev/null; then
    echo -e "  ${GREEN}✔${NC} Node.js detected: $(node --version)"
    # Run version synchronization orchestrator if present
    if [ -f "scripts/sync-version.js" ]; then
        echo -e "  ${CYAN}ℹ${NC} Synchronizing SSOT versions across 9 core project files..."
        node scripts/sync-version.js || true
    fi
    APP_VER=$(node -p "try{require('./package.json').version}catch(e){'2.4.5'}")
else
    echo -e "  ${YELLOW}⚠ Node.js not detected; using fallback version resolution.${NC}"
    APP_VER="2.4.5"
fi

echo -e "  ${GREEN}✔${NC} Active Release Target Version: ${BOLD}v${APP_VER}${NC}"
echo ""

# ------------------------------------------------------------------------------
# 2. Local Git Repository & Remote Origin Check
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[2/6] Verifying local Git repository & remote configuration...${NC}"

if [ ! -d ".git" ]; then
    echo -e "  ${CYAN}ℹ${NC} Initializing new Git repository..."
    git init
    git branch -M main
else
    echo -e "  ${GREEN}✔${NC} Existing Git repository verified."
fi

# Ensure branch is main
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "  ${CYAN}ℹ${NC} Setting main branch..."
    git branch -M main || true
fi

REMOTE_REPO="https://github.com/AhBiYout-all/grid-ip-scanner2.git"

if ! git remote get-url origin &> /dev/null; then
    echo -e "  ${CYAN}ℹ${NC} Adding remote origin: ${REMOTE_REPO}"
    git remote add origin "$REMOTE_REPO"
else
    EXISTING_REMOTE=$(git remote get-url origin)
    if [ "$EXISTING_REMOTE" != "$REMOTE_REPO" ]; then
        echo -e "  ${CYAN}ℹ${NC} Updating remote origin to: ${REMOTE_REPO}"
        git remote set-url origin "$REMOTE_REPO"
    else
        echo -e "  ${GREEN}✔${NC} Remote origin confirmed: ${REMOTE_REPO}"
    fi
fi
echo ""

# ------------------------------------------------------------------------------
# 3. Cache Purge & Clean Staging (Respecting .gitignore)
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[3/6] Purging cached ignored artifacts and staging clean source files...${NC}"

# Remove previously cached files that now match .gitignore (binaries, test folders, etc.)
git rm -r --cached . > /dev/null 2>&1 || true

# Stage all files according to current .gitignore rules
git add .
echo -e "  ${GREEN}✔${NC} All valid source files, documents, and configs staged cleanly."
echo ""

# ------------------------------------------------------------------------------
# 4. Git Commit
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[4/6] Creating commit...${NC}"

TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")
CUSTOM_MSG="$1"

if [ -n "$CUSTOM_MSG" ]; then
    COMMIT_MSG="feat: Grid IP Scanner2 v${APP_VER} - ${CUSTOM_MSG} (${TIMESTAMP})"
else
    COMMIT_MSG="feat: Grid IP Scanner2 v${APP_VER} auto-sync (${TIMESTAMP})"
fi

if git diff-index --quiet HEAD -- 2>/dev/null; then
    echo -e "  ${YELLOW}ℹ Working tree is clean. Nothing new to commit.${NC}"
else
    git commit -m "$COMMIT_MSG"
    echo -e "  ${GREEN}✔${NC} Commit created: ${BOLD}\"$COMMIT_MSG\"${NC}"
fi
echo ""

# ------------------------------------------------------------------------------
# 5. Push to GitHub Remote Main Branch
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[5/6] Pushing code to GitHub remote (origin main)...${NC}"

if ! git push -u origin main; then
    echo -e "${YELLOW}  ⚠ Standard push rejected or diverged. Pulling and rebasing from remote...${NC}"
    git pull origin main --rebase || true
    echo -e "  ${CYAN}ℹ${NC} Retrying push to origin main..."
    git push -u origin main || git push -f origin main
fi
echo -e "  ${GREEN}✔${NC} Successfully pushed to branch 'main'!"
echo ""

# ------------------------------------------------------------------------------
# 6. Publish Semantic Release Tag for Automated GitHub Actions CI/CD
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[6/6] Synchronizing Release Tag (v${APP_VER}) to trigger CI/CD...${NC}"
TAG="v${APP_VER}"

# Reset existing local and remote tag if re-releasing the same version
git tag -d "$TAG" > /dev/null 2>&1 || true
git push origin ":refs/tags/$TAG" > /dev/null 2>&1 || true

git tag -a "$TAG" -m "Release Grid IP Scanner2 $TAG"
git push origin "$TAG"
echo -e "  ${GREEN}✔${NC} Release tag ${BOLD}${TAG}${NC} pushed successfully!"
echo ""

# ------------------------------------------------------------------------------
# Summary & Output URLs
# ------------------------------------------------------------------------------
echo -e "${GREEN}======================================================================${NC}"
echo -e "${GREEN}${BOLD}🎉 SUCCESS: Grid IP Scanner2 v${APP_VER} is fully synced with GitHub!${NC}"
echo -e "${GREEN}======================================================================${NC}"
echo -e "  🌐 Repository URL : ${CYAN}https://github.com/AhBiYout-all/grid-ip-scanner2${NC}"
echo -e "  🚀 Actions CI/CD  : ${CYAN}https://github.com/AhBiYout-all/grid-ip-scanner2/actions${NC}"
echo -e "  📦 Releases URL   : ${CYAN}https://github.com/AhBiYout-all/grid-ip-scanner2/releases${NC}"
echo -e "  🏢 Affiliation    : (주)씨아이에스넷 (https://www.cisnet.co.kr)"
echo ""
echo -e "${BOLD}Automated Build Outputs being created by GitHub Actions:${NC}"
echo -e "  1. Windows Official Installer : Grid_IP_Scanner2_v${APP_VER}_Setup.exe"
echo -e "  2. Android Mobile Smartphone  : Grid_IP_Scanner2_v${APP_VER}.apk"
echo -e "  3. Mobile Web & iOS PWA Bundle: Grid_IP_Scanner2_v${APP_VER}_Mobile_PWA.zip"
echo ""
