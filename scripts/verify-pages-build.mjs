import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, posix } from 'node:path';

const DIST = 'dist';
const HTML_FILES = ['index.html', 'guruguru.html'];
const SHEET = 'A';

function fail(message) {
  console.error(`Pages build verification failed: ${message}`);
  process.exit(1);
}

function assertFile(path) {
  if (!existsSync(path)) fail(`missing file: ${path}`);
}

function readDistHtml(file) {
  const path = join(DIST, file);
  assertFile(path);
  return readFileSync(path, 'utf8');
}

function assertNoRootAssetReference(file, html) {
  const badPatterns = ['src="/assets/', 'href="/assets/'];
  for (const pattern of badPatterns) {
    if (html.includes(pattern)) {
      fail(`${file} contains root asset reference: ${pattern}`);
    }
  }
}

function assertRelativeAssetReference(file, html) {
  if (file !== 'index.html' && !html.includes('./assets/')) {
    fail(`${file} does not reference ./assets/`);
  }
}

function assertReferencedRelativeAssetsExist(file, html) {
  const attrPattern = /\b(?:src|href)="(\.\/[^"]+)"/g;
  for (const match of html.matchAll(attrPattern)) {
    const urlPath = match[1];
    const relative = urlPath.slice(2);
    assertFile(join(DIST, ...relative.split('/')));
  }
}

function assertSliceImages() {
  const dir = join(DIST, 'slices2', SHEET);
  if (!existsSync(dir)) {
    console.log('No slice image directory found; skipping slice image verification for program-only build.');
    return;
  }

  const pngFiles = readdirSync(dir).filter((name) => name.endsWith('.png'));
  if (pngFiles.length === 0) {
    console.log('No slice images found; skipping slice image verification for program-only build.');
    return;
  }

  if (pngFiles.length !== 25) {
    fail(`${posix.join('dist', 'slices2', SHEET)} should contain 25 png files, found ${pngFiles.length}`);
  }
  for (let r = 0; r < 5; r += 1) {
    for (let c = 0; c < 5; c += 1) {
      assertFile(join(dir, `r${r}c${c}.png`));
    }
  }
}

for (const file of HTML_FILES) {
  const html = readDistHtml(file);
  assertNoRootAssetReference(file, html);
  assertReferencedRelativeAssetsExist(file, html);
  assertRelativeAssetReference(file, html);
}

assertSliceImages();

console.log('Pages build verification passed.');
