/**
 * Grid IP Scanner2 - GitHub Releases Asset Retention Helper
 * Keeps the latest N (default: 3) published GitHub Releases intact with all binary assets,
 * and deletes ONLY attached binary assets from older releases while preserving release notes,
 * titles, tags, and history.
 */

const { execFileSync } = require('child_process');

function parsePositiveInt(val, fallback) {
  const n = Number.parseInt(String(val ?? ''), 10);
  return Number.isFinite(n) && n >= 1 ? n : fallback;
}

function getReleaseTimestamp(release) {
  const ts = Date.parse(release?.published_at || release?.created_at || '');
  return Number.isFinite(ts) ? ts : 0;
}

function selectReleasesForAssetPrune(releases, options = {}) {
  const keepCount = parsePositiveInt(options.keepCount, 3);
  const currentTag = typeof options.currentTag === 'string' ? options.currentTag.trim() : '';

  const published = (Array.isArray(releases) ? releases : [])
    .filter((r) => r && !r.draft && typeof r.tag_name === 'string' && r.tag_name.trim() !== '')
    .slice()
    .sort((a, b) => {
      const diff = getReleaseTimestamp(b) - getReleaseTimestamp(a);
      if (diff !== 0) return diff;
      return (Number(b.id) || 0) - (Number(a.id) || 0);
    });

  const keepTags = new Set();
  if (currentTag && published.some((r) => r.tag_name === currentTag)) {
    keepTags.add(currentTag);
  }
  for (const rel of published) {
    if (keepTags.size >= keepCount) break;
    keepTags.add(rel.tag_name);
  }

  const kept = [];
  const pruned = [];
  for (const rel of published) {
    if (keepTags.has(rel.tag_name)) {
      kept.push(rel);
    } else {
      pruned.push(rel);
    }
  }
  return { kept, pruned };
}

function fetchAllReleases(repo) {
  const raw = execFileSync(
    'gh',
    ['api', '--paginate', '--slurp', `repos/${repo}/releases?per_page=100`],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }
  );
  const parsed = JSON.parse(raw || '[]');
  return Array.isArray(parsed) ? parsed.flat() : [];
}

function deleteReleaseAsset(repo, assetId) {
  execFileSync(
    'gh',
    ['api', '-X', 'DELETE', `repos/${repo}/releases/assets/${assetId}`],
    { stdio: 'pipe', encoding: 'utf8' }
  );
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || process.env.DRY_RUN === '1';
  const repo = (process.env.GITHUB_REPOSITORY || '').trim();
  const currentTag = (process.env.CURRENT_TAG || '').trim();
  const keepCount = parsePositiveInt(process.env.KEEP_RELEASES, 3);

  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
    console.error(`❌ Invalid or missing GITHUB_REPOSITORY: "${repo}"`);
    process.exit(1);
  }

  console.log(`🧹 Checking GitHub Releases asset retention for ${repo} (keep latest ${keepCount}, preserve release notes & tags)...`);
  const releases = fetchAllReleases(repo);
  const { kept, pruned } = selectReleasesForAssetPrune(releases, { keepCount, currentTag });

  console.log(`✅ Preserving all binary assets for latest ${kept.length} release(s): ${kept.map((r) => r.tag_name).join(', ') || '(none)'}`);

  let deletedAssets = 0;
  let failedAssets = 0;

  for (const rel of pruned) {
    const assets = Array.isArray(rel.assets) ? rel.assets : [];
    if (assets.length === 0) {
      console.log(`   - ${rel.tag_name}: already has 0 binary assets (notes/history preserved).`);
      continue;
    }
    console.log(`   - ${rel.tag_name}: pruning ${assets.length} binary asset(s) while keeping release notes & tag...`);
    for (const asset of assets) {
      if (!asset || !asset.id) continue;
      if (dryRun) {
        console.log(`     [DRY-RUN] Would delete asset "${asset.name}" (id=${asset.id})`);
        deletedAssets++;
        continue;
      }
      try {
        deleteReleaseAsset(repo, asset.id);
        console.log(`     🗑️ Deleted asset: ${asset.name} (id=${asset.id})`);
        deletedAssets++;
      } catch (err) {
        failedAssets++;
        console.warn(`     ⚠️ Could not delete asset "${asset.name}" (id=${asset.id}): ${err.message}`);
      }
    }
  }

  console.log(`🎉 Release asset retention complete: ${deletedAssets} asset(s) removed across ${pruned.length} older release(s), ${failedAssets} failure(s).`);
}

if (require.main === module) {
  main();
}

module.exports = {
  selectReleasesForAssetPrune,
  parsePositiveInt,
};
