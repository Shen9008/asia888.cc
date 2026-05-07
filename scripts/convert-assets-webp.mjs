#!/usr/bin/env node
/**
 * Converts raster images under assets/img (jpg/jpeg/png) to WebP (~quality 85),
 * deletes originals after successful write, then updates href/src and CSS url() refs.
 *
 * Leaves assets/icons unchanged (favicon and touch icons stay PNG).
 *
 * Usage: npm run build:webp
 */
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const imgRoot = path.join(root, 'assets', 'img');

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png']);

/** @returns {Promise<string[]>} */
async function collectImages(dir) {
  const out = [];
  let entries = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      out.push(...(await collectImages(full)));
      continue;
    }
    const ext = path.extname(ent.name).toLowerCase();
    if (IMAGE_EXT.has(ext)) out.push(full);
  }
  return out;
}

function patchMarkup(content) {
  return content
    .replace(/(\/assets\/img\/[^"'\s>)]*?)\.(jpg|jpeg|png)\b/gi, '$1.webp')
    .replace(
      /(https:\/\/asia888\.cc\/assets\/img\/[^"'\s>)]*?)\.(jpg|jpeg|png)\b/gi,
      '$1.webp',
    );
}

/** Gather text files under root that likely reference asset paths */
async function gatherPatchTargets() {
  const targets = new Set();

  /** @param {string} relDir */
  async function walkDir(relDir) {
    let names = [];
    try {
      names = await fs.readdir(path.join(root, relDir));
    } catch {
      return;
    }
    for (const name of names) {
      const rel = path.join(relDir, name).replace(/\\/g, '/');
      const abs = path.join(root, rel);
      const st = await fs.stat(abs).catch(() => null);
      if (!st) continue;
      if (st.isDirectory()) {
        if (rel === '.git' || rel === 'node_modules') continue;
        await walkDir(rel);
      } else if (/\.(html|css|js|json|md)$/i.test(name)) {
        targets.add(abs);
      }
    }
  }

  await walkDir('.');
  return [...targets];
}

async function patchAllFiles() {
  const targets = await gatherPatchTargets();
  let changed = 0;
  for (const abs of targets) {
    const raw = await fs.readFile(abs, 'utf8');
    const next = patchMarkup(raw);
    if (next !== raw) {
      await fs.writeFile(abs, next, 'utf8');
      changed++;
      console.log('patched', path.relative(root, abs));
    }
  }
  console.log(`Reference patch: ${changed} file(s) updated`);
}

async function main() {
  const list = await collectImages(imgRoot);
  if (!list.length) {
    console.warn('No images found under', path.relative(root, imgRoot));
    return;
  }

  console.log(`Converting ${list.length} image(s) to WebP …`);
  let ok = 0;
  for (const srcPath of list) {
    const ext = path.extname(srcPath).toLowerCase();
    const stem = srcPath.slice(0, -ext.length);
    const destPath = `${stem}.webp`;
    if (destPath === srcPath) continue;

    try {
      await sharp(srcPath)
        .webp({ quality: 85, effort: 6, smartSubsample: true })
        .toFile(destPath);

      await fs.unlink(srcPath);
      ok++;
      console.log(' ok', path.relative(root, destPath));
    } catch (err) {
      console.error(' FAIL', path.relative(root, srcPath), err.message);
      process.exitCode = 1;
    }
  }

  console.log(`Done converting: ${ok}/${list.length}`);
  await patchAllFiles();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
