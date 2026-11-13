/**
 * Grid IP Scanner2 - Master Native DLL Build Orchestrator
 * Compiles & distributes all 12 modular C/C++ native DLLs into root, winres/, and dist_installer/.
 * Copyright (c) 2025-2026 AhBiYout. All rights reserved.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Grid IP Scanner2 - Master Native DLL Build Orchestrator (12 Modules) Started');

const rootDir = path.resolve(__dirname, '..');
const nativeDllDir = path.join(rootDir, 'native_dll');

const DLL_TARGETS = [
  {
    name: 'grid_probe_engine.dll',
    src: 'grid_probe_engine.c',
    lang: 'c',
    define: 'BUILDING_GRID_PROBE_ENGINE',
    libs: ['-lws2_32', '-liphlpapi'],
  },
  {
    name: 'grid_port_iocp.dll',
    src: 'grid_port_iocp.c',
    lang: 'c',
    define: 'BUILDING_GRID_PORT_IOCP',
    libs: ['-lws2_32'],
  },
  {
    name: 'grid_discovery.dll',
    src: 'grid_discovery.c',
    lang: 'c',
    define: 'BUILDING_GRID_DISCOVERY',
    libs: ['-lws2_32'],
  },
  {
    name: 'grid_oui_trie.dll',
    src: 'grid_oui_trie.c',
    lang: 'c',
    define: 'BUILDING_GRID_OUI_TRIE',
    libs: [],
  },
  {
    name: 'grid_banner_grabber.dll',
    src: 'grid_banner_grabber.c',
    lang: 'c',
    define: 'BUILDING_GRID_BANNER_GRABBER',
    libs: ['-lws2_32'],
  },
  {
    name: 'grid_pcap_analyzer.dll',
    src: 'grid_pcap_analyzer.c',
    lang: 'c',
    define: 'BUILDING_GRID_PCAP_ANALYZER',
    libs: ['-lws2_32', '-liphlpapi'],
  },
  {
    name: 'grid_fingerprint_engine.dll',
    src: 'grid_fingerprint_engine.c',
    lang: 'c',
    define: 'BUILDING_GRID_FINGERPRINT_ENGINE',
    libs: [],
  },
  {
    name: 'grid_topology_guard.dll',
    src: 'grid_topology_guard.c',
    lang: 'c',
    define: 'BUILDING_GRID_TOPOLOGY_GUARD',
    libs: [],
  },
  {
    name: 'grid_net_driver.dll',
    src: 'grid_net_driver.c',
    lang: 'c',
    define: 'BUILDING_GRID_NET_DRIVER',
    libs: ['-lws2_32', '-liphlpapi'],
  },
  {
    name: 'grid_vault_driver.dll',
    src: 'grid_vault_driver.c',
    lang: 'c',
    define: 'BUILDING_GRID_VAULT_DRIVER',
    libs: ['-lcrypt32', '-ladvapi32'],
  },
  {
    name: 'oui_validator.dll',
    src: 'oui_validator.cpp',
    lang: 'cpp',
    define: 'BUILDING_OUI_VALIDATOR',
    libs: [],
  },
  {
    name: 'secure_vault.dll',
    src: 'secure_vault.cpp',
    lang: 'cpp',
    define: 'BUILDING_SECURE_VAULT',
    libs: ['-lbcrypt', '-lcrypt32', '-ladvapi32'],
  },
];

function findCompiler(candidates) {
  for (const cc of candidates) {
    try {
      execSync(`${cc} --version`, { stdio: 'ignore' });
      return cc;
    } catch {
      // Not available
    }
  }
  return null;
}

const cCompiler = findCompiler(['x86_64-w64-mingw32-gcc', 'gcc', 'clang']);
const cppCompiler = findCompiler(['x86_64-w64-mingw32-g++', 'g++', 'clang++']) || cCompiler;

if (!cCompiler) {
  console.log('ℹ️ Notice: No Windows/MinGW C compiler found in PATH. Skipping DLL compilation; Go runtime fallbacks remain active.');
} else {
  console.log(`   - Detected C Compiler: ${cCompiler} | C++ Compiler: ${cppCompiler}`);
  for (const mod of DLL_TARGETS) {
    const srcPath = path.join(nativeDllDir, mod.src);
    const outInNative = path.join(nativeDllDir, mod.name);
    if (!fs.existsSync(srcPath)) continue;

    const compiler = mod.lang === 'cpp' ? cppCompiler : cCompiler;
    const stdFlag = mod.lang === 'cpp' ? '-std=c++17 -static-libstdc++' : '';
    const cmd = `${compiler} -O3 -s -shared -Wall -D${mod.define} ${stdFlag} -static-libgcc "${srcPath}" -o "${outInNative}" ${mod.libs.join(' ')}`;
    try {
      execSync(cmd, { cwd: nativeDllDir, stdio: 'inherit' });
      console.log(`✅ [OK] Compiled ${mod.name}`);
    } catch (e) {
      console.warn(`⚠️ [WARN] Failed to compile ${mod.name}: ${e.message}`);
    }
  }
}

// Synchronize any available DLLs from native_dll/ to root, winres/, and dist_installer/
let syncedCount = 0;
const winresDir = path.join(rootDir, 'winres');
const distInstallerDir = path.join(rootDir, 'dist_installer');

for (const mod of DLL_TARGETS) {
  const srcDll = path.join(nativeDllDir, mod.name);
  const rootDll = path.join(rootDir, mod.name);
  const activeSrc = fs.existsSync(srcDll) ? srcDll : (fs.existsSync(rootDll) ? rootDll : null);
  if (!activeSrc) continue;

  if (activeSrc !== rootDll) {
    fs.copyFileSync(activeSrc, rootDll);
  }
  if (fs.existsSync(winresDir)) {
    fs.copyFileSync(activeSrc, path.join(winresDir, mod.name));
  }
  if (fs.existsSync(distInstallerDir)) {
    fs.copyFileSync(activeSrc, path.join(distInstallerDir, mod.name));
  }
  syncedCount++;
}

console.log(`📦 Synchronized ${syncedCount}/${DLL_TARGETS.length} Native DLL modules.`);
console.log('✨ Native DLL Orchestrator execution complete!\n');
