/**
 * Grid IP Scanner2 - Standalone Mobile Repository Generator
 * Exports a clean, dedicated mobile repository directory (dist_releases/mobile_repository)
 * ready to be pushed to a standalone GitHub repository (e.g., AhBiYout-all/grid-ip-scanner2-mobile).
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const version = pkg.version || '2.4.3';

console.log(`📱 Generating Standalone Mobile GitHub Repository Structure (v${version})...`);

const mobileRepoDir = path.join(rootDir, 'dist_releases', 'mobile_repository');
if (fs.existsSync(mobileRepoDir)) {
  fs.rmSync(mobileRepoDir, { recursive: true, force: true });
}
fs.mkdirSync(mobileRepoDir, { recursive: true });

// 1. Build web distribution if not present
const distDir = path.join(rootDir, 'dist');
if (!fs.existsSync(distDir)) {
  console.log('   - Building web assets via npm run build...');
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
}

// 2. Copy dist folder to mobile_repository/dist
function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(child => {
      copyRecursive(path.join(src, child), path.join(dest, child));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

copyRecursive(distDir, path.join(mobileRepoDir, 'dist'));
copyRecursive(path.join(rootDir, 'public'), path.join(mobileRepoDir, 'public'));

// 3. Create mobile package.json
const mobilePkg = {
  name: "grid-ip-scanner2-mobile",
  version: version,
  description: "Grid IP Scanner2 - Mobile & PWA Edition for Android and iOS",
  author: "AhBiYout",
  homepage: "http://www.cisnet.co.kr",
  repository: {
    type: "git",
    url: "https://github.com/AhBiYout-all/grid-ip-scanner2-mobile.git"
  },
  scripts: {
    "start": "npx serve dist -l 3000",
    "build": "vite build",
    "preview": "vite preview"
  },
  dependencies: {
    "react": (pkg.dependencies && pkg.dependencies.react) || "^19.0.0",
    "react-dom": (pkg.dependencies && pkg.dependencies["react-dom"]) || "^19.0.0",
    "lucide-react": (pkg.dependencies && pkg.dependencies["lucide-react"]) || "^0.460.0"
  }
};
fs.writeFileSync(path.join(mobileRepoDir, 'package.json'), JSON.stringify(mobilePkg, null, 2), 'utf8');

// 4. Create mobile README.md
const mobileReadme = `# 📱 Grid IP Scanner2 - Mobile & PWA Edition (v${version})

[![Release](https://img.shields.io/badge/Release-v${version}-blue.svg)](https://github.com/AhBiYout-all/grid-ip-scanner2/releases)
[![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20iOS%20PWA%20%7C%20Web-green.svg)](http://www.cisnet.co.kr)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-orange.svg)](https://www.gnu.org/licenses/gpl-3.0)

스마트폰, 태블릿, iPad 및 모바일 디바이스 환경에 최적화된 **Grid IP Scanner2 공식 모바일 배포판**입니다.

---

## ✨ 모바일 에디션 핵심 기능
* **터치 친화형 UI/UX**: 스마트폰 세로/가로 모드 자동 감응형 그리드 및 탭 인터페이스
* **초고속 C-Class 스캐너**: 서브넷 내 254개 단말 동시 진단 및 레이턴시 실시간 모니터링
* **9만건+ OUI 하드웨어 제조사 식별**: IEEE 및 Wireshark OUI 오프라인 마스터 DB 완벽 내장
* **PWA (Progressive Web App) 오프라인 지원**: 인터넷 연결 없이도 브라우저 홈 화면에 추가하여 네이티브 앱처럼 실행
* **안드로이드 네이티브 APK 지원**: Native ARM64 스캔 엔진이 내장된 독립 APK 파일 제공

---

## 📥 설치 및 실행 방법

### 1. 안드로이드 (Android APK)
1. [Releases](https://github.com/AhBiYout-all/grid-ip-scanner2/releases)에서 \`Grid_IP_Scanner2_v${version}.apk\` 다운로드
2. 다운로드 완료 후 터치하여 설치 (설정 -> '출처를 알 수 없는 앱 설치' 허용)

### 2. iPhone / iPad (iOS Safari PWA)
1. Safari 브라우저에서 모바일 웹 주소 접속
2. 하단 중앙 **[공유(Share)]** 아이콘 터치
3. **[홈 화면에 추가 (Add to Home Screen)]** 선택
4. 홈 화면에 생성된 아이콘을 터치하여 전체 화면 앱으로 실행

### 3. 모바일 웹 서버 호스팅 (사내망/로컬)
\`\`\`bash
npm install
npm start
# http://<서버IP>:3000 으로 스마트폰 브라우저에서 접속
\`\`\`

---

## 🏢 라이선스 및 문의
* **개발사/저작권**: AhBiYout (Copyright © 2025-2026 AhBiYout. All rights reserved.)
* **공식 웹사이트**: http://www.cisnet.co.kr
* **공식 블로그**: https://ahbiyoutvibe.blogspot.com/
`;
fs.writeFileSync(path.join(mobileRepoDir, 'README.md'), mobileReadme, 'utf8');

// 5. Create mobile .gitignore
const mobileGitignore = `# Dependencies
node_modules/
.pnp
.pnp.js

# Build Output
dist_releases/
*.apk
*.zip
*.log
.DS_Store
Thumbs.db
`;
fs.writeFileSync(path.join(mobileRepoDir, '.gitignore'), mobileGitignore, 'utf8');

// 6. Copy APK and PWA Zip into mobile_repository/releases
const releasesDir = path.join(mobileRepoDir, 'releases');
fs.mkdirSync(releasesDir, { recursive: true });

const rootApk = path.join(rootDir, `Grid_IP_Scanner2_v${version}.apk`);
const rootZip = path.join(rootDir, `Grid_IP_Scanner2_v${version}_Mobile_PWA.zip`);

if (fs.existsSync(rootApk)) {
  fs.copyFileSync(rootApk, path.join(releasesDir, `Grid_IP_Scanner2_v${version}.apk`));
}
if (fs.existsSync(rootZip)) {
  fs.copyFileSync(rootZip, path.join(releasesDir, `Grid_IP_Scanner2_v${version}_Mobile_PWA.zip`));
}

// 7. Create 1-click push script for mobile repository
const pushBat = `@echo off
title Push Grid IP Scanner2 Mobile to GitHub
color 0B
echo ======================================================================
echo    Grid IP Scanner2 Mobile - GitHub Repository Initializer & Push
echo ======================================================================
echo.
set /p REPO_URL="Enter Target GitHub Mobile Repository URL (Default: https://github.com/AhBiYout-all/grid-ip-scanner2-mobile.git): "
if "%REPO_URL%"=="" set REPO_URL=https://github.com/AhBiYout-all/grid-ip-scanner2-mobile.git

if not exist ".git\" (
    git init
    git branch -M main
)
git remote remove origin 2>nul
git remote add origin %REPO_URL%
git add .
git commit -m "feat: Grid IP Scanner2 Mobile & PWA v${version} initial release"
echo.
echo Pushing to %REPO_URL%...
git push -u origin main
echo.
echo Complete!
pause
`;
fs.writeFileSync(path.join(mobileRepoDir, 'push-to-github.bat'), pushBat, 'utf8');

console.log(`✅ [OK] Standalone Mobile Repository exported successfully:`);
console.log(`   📁 Directory: dist_releases/mobile_repository/`);
console.log(`   📄 Files created: package.json, README.md, .gitignore, dist/, releases/, push-to-github.bat\n`);
