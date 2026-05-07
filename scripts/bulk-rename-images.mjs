#!/usr/bin/env node
/**
 * Bulk-rename image files to kebab-case (lowercase, spaces/underscores → hyphens).
 * Windows-safe: case-only renames use a two-step temp name.
 *
 * Usage:
 *   node scripts/bulk-rename-images.mjs [dir]
 *   node scripts/bulk-rename-images.mjs --dir ./assets/img/slots --recursive
 *   node scripts/bulk-rename-images.mjs ./assets/img --dry-run
 *
 * Options:
 *   --dir <path>     Root directory (default: first positional arg or ./assets/img)
 *   --recursive,-r   Walk subdirectories
 *   --dry-run,-n     Print planned renames only
 *   --force          Overwrite if target exists (default: skip + warn)
 */

import fs from "node:fs/promises";
import path from "node:path";

const IMAGE_EXT = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
  ".avif",
  ".bmp",
  ".ico",
]);

/**
 * @param {string} base filename without path
 */
function toKebabFilename(base) {
  const ext = path.extname(base);
  const stem = path.basename(base, ext);
  let s = stem
    .normalize("NFC")
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-zA-Z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (!s) s = "image";
  return `${s.toLowerCase()}${ext.toLowerCase()}`;
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} dir
 * @param {object} opts
 */
async function collectFiles(dir, { recursive }) {
  /** @type {string[]} */
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (recursive) files.push(...(await collectFiles(full, { recursive })));
      continue;
    }
    if (!ent.isFile()) continue;
    const ext = path.extname(ent.name).toLowerCase();
    if (IMAGE_EXT.has(ext)) files.push(full);
  }
  return files;
}

/**
 * Rename with Windows-safe handling when only casing changes.
 * @param {string} from
 * @param {string} to
 * @param {{ dryRun: boolean, force: boolean }} opts
 */
async function safeRename(from, to, opts) {
  if (path.normalize(from) === path.normalize(to)) return;

  const toExists = await exists(to);
  let sameInode = false;
  if (toExists) {
    try {
      const [a, b] = await Promise.all([fs.lstat(from), fs.lstat(to)]);
      sameInode = a.ino === b.ino && a.dev === b.dev;
    } catch {
      /* ignore */
    }
  }

  if (toExists && !sameInode) {
    if (!opts.force) {
      console.warn(`skip (target exists): ${to}`);
      return;
    }
    await fs.rm(to, { force: true });
  }

  if (opts.dryRun) {
    console.log(`${from}  →  ${to}`);
    return;
  }

  const dirname = path.dirname(from);
  const caseOnly =
    path.basename(from).toLowerCase() === path.basename(to).toLowerCase() &&
    path.basename(from) !== path.basename(to);

  if (caseOnly && process.platform === "win32") {
    const tmp = path.join(
      dirname,
      `.rename-tmp-${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(from)}`
    );
    await fs.rename(from, tmp);
    await fs.rename(tmp, to);
  } else {
    await fs.rename(from, to);
  }
}

async function main() {
  const opts = parseArgv();
  const root = path.resolve(opts.dir);

  let stat;
  try {
    stat = await fs.stat(root);
  } catch (e) {
    console.error(`Not a directory: ${root}`);
    process.exit(1);
  }
  if (!stat.isDirectory()) {
    console.error(`Not a directory: ${root}`);
    process.exit(1);
  }

  const files = await collectFiles(root, { recursive: opts.recursive });
  /** @type {{ from: string, to: string }[]} */
  const plan = [];

  for (const full of files) {
    const base = path.basename(full);
    const next = toKebabFilename(base);
    if (base === next) continue;
    const to = path.join(path.dirname(full), next);
    plan.push({ from: full, to });
  }

  if (plan.length === 0) {
    console.log("No renames needed.");
    return;
  }

  if (opts.dryRun) {
    console.log(`Dry run (${plan.length} file(s)):\n`);
  } else {
    console.log(`Renaming ${plan.length} file(s)...\n`);
  }

  const usedTargets = new Set();
  for (const { from, to } of plan) {
    const key = to.toLowerCase();
    if (usedTargets.has(key)) {
      console.warn(`skip (duplicate target in batch): ${from} → ${path.basename(to)}`);
      continue;
    }
    usedTargets.add(key);
    await safeRename(from, to, opts);
  }

  if (opts.dryRun) {
    console.log("\nRun without --dry-run to apply.");
  }
}

function parseArgv() {
  const args = process.argv.slice(2);
  const out = {
    dir: null,
    recursive: false,
    dryRun: false,
    force: false,
  };
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--recursive" || a === "-r") out.recursive = true;
    else if (a === "--dry-run" || a === "-n") out.dryRun = true;
    else if (a === "--force") out.force = true;
    else if (a === "--dir" && args[i + 1]) {
      out.dir = args[++i];
    } else if (!a.startsWith("-")) positional.push(a);
  }
  if (!out.dir) out.dir = positional[0] ?? path.join(process.cwd(), "assets", "img");
  return out;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
