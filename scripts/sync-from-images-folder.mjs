#!/usr/bin/env node
/**
 * Converts raster files under Images/ to optimised assets/img WebP (+ icons PNG).
 *
 * Mirrors existing kebab-case paths under assets/img. Run after adding sources in Images/.
 *
 * Usage: npm run sync:images
 *        node scripts/sync-from-images-folder.mjs --dry-run
 */
import sharp from "sharp";
import fs from "fs/promises";
import fsSync from "node:fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const imagesRoot = path.join(root, "Images");

const RAS_EXT = new Set([".jpg", ".jpeg", ".png"]);

/** PNG outputs referenced in HTML */
const ICON_JOBS = [
  { src: "Images/logo.png", destRelative: "assets/icons/logo.png", maxW: 480 },
  {
    src: "Images/favicon (1).png",
    altSrc: "Images/favicon.png",
    destRelative: "assets/icons/favicon.png",
    maxW: 96,
    square: true,
  },
];

/** Source filename stem typos → site slug */
const STEM_FILENAME_OVERRIDES = Object.freeze({
  decima: "decimal",
  "playn-go": "play-n-go",
});

function normalizeStemForSlug(stem) {
  let s = stem.normalize("NFC").replace(/\u2019|\u2032/g, "'");
  s = s.replace(/'s\b/gi, "-s");
  s = s.replace(/'/g, "");
  return s;
}

function stemSlug(rawStem) {
  let s = normalizeStemForSlug(rawStem).replace(/\./g, "-");
  s = s.replace(/[\s_]+/g, "-").replace(/[^a-zA-Z0-9.-]+/g, "-");
  s = s.replace(/-+/g, "-").replace(/^-|-$/g, "");
  s = s.toLowerCase();
  return STEM_FILENAME_OVERRIDES[s] ?? s;
}

function posixRel(full) {
  return path.relative(root, full).split(path.sep).join("/");
}

/** @param {string[]} segments under assets/img */
function assetsImgRel(...segments) {
  return path.posix.join("assets", "img", ...segments);
}

function PathBasenoExt(fname) {
  return path.basename(fname, path.extname(fname));
}

/**
 * @param {string} relImages — e.g. Images/Hero Banner/FAQ.jpg
 * @returns {string} posix path assets/img/...webp
 */
function imagesRelToAssetsDestposix(relImages) {
  const parts = relImages.split("/").slice(1);
  if (!parts.length) throw new Error("empty path");

  const top = parts[0];
  const file = parts[parts.length - 1];
  const stem = stemSlug(PathBasenoExt(file));

  if (top === "Hero Banner") {
    return assetsImgRel("banners", `${stem}.webp`);
  }

  if (top === "Home") {
    if (parts.length === 2 && /home-main visual/i.test(file))
      return assetsImgRel("home", "home-main-visual.webp");
    if (parts[1] === "game card") return assetsImgRel("home", "game-cards", `${stem}.webp`);
    if (parts[1] === "icon") return assetsImgRel("home", "icons", `${stem}.webp`);
    throw new Error(`Unmapped Images/Home branch: ${relImages}`);
  }

  /** Folder slug → subdir under slots/ */
  const slotsSubSlug = stemSlug(parts[1]);
  const slotsDirBySlug = new Map([
    ["bonus-buy-highlights", "bonus-buy-highlights"],
    ["classic-retro", "classic-retro"],
    ["free-spins-features", "free-spins-features"],
    ["higher-rtp", "higher-rtp"],
    ["hold-spin", "hold-spin"],
    ["jackpot-must-drop", "jackpot-must-drop"],
    ["logos", "logos"],
    ["popular-slots", "popular-slots"],
  ]);

  if (top === "Live Casino") {
    const cat = stemSlug(parts[1]);
    return assetsImgRel("live-casino", cat, `${stem}.webp`);
  }

  if (top === "Promos") {
    const cat = stemSlug(parts[1]);
    return assetsImgRel("promos", cat, `${stem}.webp`);
  }

  if (top === "Slots") {
    const sub = slotsDirBySlug.get(slotsSubSlug);
    if (!sub) throw new Error(`Unmapped Slots folder "${parts[1]}" (slug "${slotsSubSlug}")`);
    return assetsImgRel("slots", sub, `${stem}.webp`);
  }

  if (top === "Sports") {
    const sub = parts[1];
    const skey = stemSlug(sub);

    /** @type {string[]} */
    let mid = [];

    const bestFeatures = /^best\s+asia888\s+sports\s+features$/i.test(sub.trim());
    if (bestFeatures) mid = ["sports", "features"];
    else if (skey.includes("match") && skey.includes("prediction"))
      mid = ["sports", "match-prediction-odds"];
    else if (skey.includes("odds") && skey.includes("types")) mid = ["sports", "odds-types"];
    else if (/sports\s+coverage/i.test(sub)) mid = ["sports", "coverage"];
    else if (/^logos$/i.test(sub.trim())) mid = ["sports", "logos"];
    else throw new Error(`Unmapped Images/Sports folder: ${sub}`);

    let name = stem;
    if (mid.join("/") === "sports/logos" && /^NBA WNBA$/i.test(PathBasenoExt(file)))
      name = "nba-wnba";

    return assetsImgRel(...mid, `${name}.webp`);
  }

  throw new Error(`Unmapped Images top folder: ${top}`);
}

/** @typedef {{width?: number, banner?:boolean, iconTiny?:boolean, logoStrip?:boolean}} JobHint */

/** @returns {JobHint} */
function hintFor(absDestNormalized) {
  const p = absDestNormalized.replace(/\\/g, "/").toLowerCase();
  if (p.includes("/banners/")) return { width: 1920, banner: true };
  if (p.includes("/home/game-cards/") || p.includes("home-main-visual"))
    return { width: 1200 };
  if (p.includes("/home/icons/")) return { width: 96, iconTiny: true };
  if (/\/logos\//.test(p)) return { width: 280, logoStrip: true };
  return { width: 980 };
}

async function walkImagesFiles() {
  /** @type {string[]} */
  const out = [];
  async function walk(dir) {
    const ents = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const e of ents) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.isFile() && RAS_EXT.has(path.extname(e.name).toLowerCase()))
        out.push(p);
    }
  }
  if (fsSync.existsSync(imagesRoot)) await walk(imagesRoot);
  return out;
}

async function ensureDir(destAbs) {
  await fs.mkdir(path.dirname(destAbs), { recursive: true });
}

async function toWebp(srcAbs, destAbs, hint) {
  await ensureDir(destAbs);
  const meta = await sharp(srcAbs).metadata();
  const iw = meta.width ?? 9999;

  let targetW = hint.width ?? 980;
  if (hint.iconTiny) targetW = 160;

  if (hint.banner && iw < targetW) targetW = iw;

  let img = sharp(srcAbs).rotate();
  if (!hint.banner && iw < targetW) targetW = iw;

  if (targetW < iw)
    img = img.resize(Math.round(targetW), null, {
      fit: "inside",
      withoutEnlargement: true,
    });

  await img
    .webp({
      quality: hint.iconTiny || hint.logoStrip ? 88 : 82,
      effort: 6,
      smartSubsample: true,
    })
    .toFile(destAbs);
}

async function toPngIcon(srcAbs, destAbs, maxW) {
  await ensureDir(destAbs);
  await sharp(srcAbs)
    .rotate()
    .resize(maxW, null, { fit: "inside", withoutEnlargement: true })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(destAbs);
}

async function toPngSquareIcon(srcAbs, destAbs, size) {
  await ensureDir(destAbs);
  await sharp(srcAbs)
    .rotate()
    .resize(size, size, {
      fit: "cover",
      position: sharp.strategy.attention,
    })
    .png({ compressionLevel: 9 })
    .toFile(destAbs);
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  /** @type {Set<string>} */
  const tracked = new Set();
  async function scanAssetsImg(dirRel) {
    const abs = path.join(root, dirRel);
    const ents = await fs.readdir(abs, { withFileTypes: true }).catch(() => []);
    for (const e of ents) {
      const rp = path.posix.join(dirRel.replace(/\\/g, "/"), e.name);
      if (e.isDirectory()) await scanAssetsImg(rp);
      else if (e.name.endsWith(".webp"))
        tracked.add(rp.replace(/^assets\/img\//i, ""));
    }
  }
  await scanAssetsImg("assets/img");

  const srcFiles = await walkImagesFiles();
  /** @type {string[]} */
  const unmapped = [];

  console.log(
    `${dryRun ? "[dry-run] " : ""}Images → assets (${srcFiles.length} raster sources under Images/)\n`
  );

  for (const abs of srcFiles) {
    let relFull = posixRel(abs).replace(/^images\//i, "Images/");

    const leaf = path.basename(abs);
    if (leaf.startsWith(".")) continue;

    if (/^Images\/(logo\.png|favicon)/i.test(relFull.replace(/\\/g, "/"))) continue;

    /** @type {string} */
    let destPosix;
    try {
      destPosix = imagesRelToAssetsDestposix(relFull);
    } catch (e) {
      console.warn("SKIP (unmapped):", relFull, String(e.message));
      unmapped.push(relFull);
      continue;
    }

    const tail = destPosix.replace(/^assets\/img\//i, "");
    const destAbs = path.join(root, ...destPosix.split("/"));

    const hint = hintFor(destAbs);
    if (!tracked.has(tail)) console.warn("WARN not in scanned index (writes anyway):", tail);

    console.log(relFull.padEnd(68), "→", tail.padEnd(52));

    if (!dryRun) await toWebp(abs, destAbs, hint);
  }

  for (const job of ICON_JOBS) {
    let absSrc = path.join(root, ...job.src.split("/"));
    if (job.altSrc)
      try {
        await fs.access(absSrc);
      } catch {
        absSrc = path.join(root, ...job.altSrc.split("/"));
      }

    console.log(job.src, "→", job.destRelative);
    try {
      await fs.access(absSrc);
    } catch {
      console.warn("  (missing source)");
      continue;
    }

    const destAbs = path.join(root, ...job.destRelative.split("/"));

    if (dryRun) continue;
    if (job.square)
      await toPngSquareIcon(absSrc, destAbs, job.maxW);
    else await toPngIcon(absSrc, destAbs, job.maxW);
  }

  if (unmapped.length) {
    console.error(`\nFailed: ${unmapped.length} source file(s) unmapped`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
