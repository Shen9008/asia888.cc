'use strict';

require('./lib/load-env.js');

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { fetchPosts, assertSiteFilterConfig } = require('./lib/fetch-posts.js');
const { normalizePost, validatePost } = require('./lib/normalize-post.js');
const { renderArticle } = require('./lib/render-article.js');
const { generateSitemap } = require('./lib/generate-sitemap.js');

const ROOT = path.resolve(__dirname, '..');
const BLOGS_JSON_PATH = path.join(ROOT, 'assets/data/blogs.json');

const BLOGS_JSON_FIELDS = [
  'slug', 'title', 'meta_title', 'meta_description', 'focus_keyword',
  'category', 'search_intent', 'published_date', 'reading_time',
  'excerpt', 'placeholder_gradient', 'related_posts', 'keywords',
  'synced_at', 'cms_updated_at', 'content_hash',
];

function sortBlogsByLatestSyncFirst(a, b) {
  const aHasSync = Boolean(a.synced_at);
  const bHasSync = Boolean(b.synced_at);
  if (aHasSync !== bHasSync) return aHasSync ? -1 : 1;

  if (aHasSync && bHasSync) {
    const tb = new Date(b.synced_at).getTime();
    const ta = new Date(a.synced_at).getTime();
    if (tb !== ta) return tb - ta;
  }

  const pb = new Date(b.published_date || 0).getTime();
  const pa = new Date(a.published_date || 0).getTime();
  if (pb !== pa) return pb - pa;

  const cb = new Date(b.cms_updated_at || 0).getTime();
  const ca = new Date(a.cms_updated_at || 0).getTime();
  if (cb !== ca) return cb - ca;

  return String(b.slug).localeCompare(String(a.slug));
}

function contentHash(rawContent) {
  const str = typeof rawContent === 'string'
    ? rawContent
    : JSON.stringify(rawContent ?? '');
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}

function postSlug(raw) {
  return raw.slug || raw.documentId || '';
}

function sortByPublishedAtAsc(posts) {
  return posts.slice().sort(
    (a, b) => new Date(a.publishedAt || 0) - new Date(b.publishedAt || 0),
  );
}

function postNeedsRefresh(existing, raw) {
  const hash = contentHash(raw.content);
  const cmsUpdatedAt = raw.updatedAt || raw.publishedAt || '';

  if (!existing.content_hash && !existing.cms_updated_at) {
    return false;
  }

  if (existing.content_hash && existing.content_hash !== hash) return true;
  if (existing.cms_updated_at && cmsUpdatedAt && existing.cms_updated_at !== cmsUpdatedAt) {
    return true;
  }
  return false;
}

function parseLimit(argv) {
  const idx = argv.indexOf('--limit');
  if (idx === -1 || idx + 1 >= argv.length) return null;
  const n = parseInt(argv[idx + 1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function toBlogsEntry(normalized, raw) {
  const entry = {};
  for (const k of BLOGS_JSON_FIELDS) {
    if (normalized[k] !== undefined) entry[k] = normalized[k];
  }
  entry.cms_updated_at = raw.updatedAt || raw.publishedAt || '';
  entry.content_hash = contentHash(raw.content);
  entry.synced_at = new Date().toISOString();
  return entry;
}

function getRelatedSlugs(blogs, currentSlug, opts = {}, limit = 3) {
  const searchIntent = (opts.searchIntent || 'informational').toLowerCase();
  const category = (opts.category || '').toLowerCase();
  const others = blogs.filter((b) => b.slug !== currentSlug);

  const sameIntent = others.filter((b) => (b.search_intent || '').toLowerCase() === searchIntent).sort(sortBlogsByLatestSyncFirst);
  const sameIntentSlugs = new Set(sameIntent.map((b) => b.slug));
  const sameCategory = others
    .filter((b) => !sameIntentSlugs.has(b.slug) && category && (b.category || '').toLowerCase() === category)
    .sort(sortBlogsByLatestSyncFirst);
  const sameCategorySlugs = new Set(sameCategory.map((b) => b.slug));
  const rest = others
    .filter((b) => !sameIntentSlugs.has(b.slug) && !sameCategorySlugs.has(b.slug))
    .sort(sortBlogsByLatestSyncFirst);

  const merged = [...sameIntent, ...sameCategory, ...rest];
  return merged.slice(0, limit).map((b) => b.slug);
}

function loadBlogsJson() {
  try {
    const raw = fs.readFileSync(BLOGS_JSON_PATH, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveBlogsJson(blogs) {
  const json = JSON.stringify(blogs, null, 2);
  fs.writeFileSync(BLOGS_JSON_PATH, json + '\n', 'utf8');
}

function upsertBlogEntry(blogs, entry) {
  const idx = blogs.findIndex((b) => b.slug === entry.slug);
  if (idx === -1) {
    blogs.push(entry);
  } else {
    blogs[idx] = entry;
  }
}

function buildWorklist(strapiPosts, existingBlogs, flags) {
  const { all, daily, refresh, force, limit } = flags;
  const knownBySlug = new Map(existingBlogs.map((b) => [b.slug, b]));
  const apiBySlug = new Map();

  for (const p of strapiPosts) {
    const slug = postSlug(p);
    if (slug) apiBySlug.set(slug, p);
  }

  const newPosts = sortByPublishedAtAsc(
    strapiPosts.filter((p) => {
      const slug = postSlug(p);
      return slug && !knownBySlug.has(slug);
    }),
  );

  const changedPosts = sortByPublishedAtAsc(
    existingBlogs
      .filter((b) => {
        const raw = apiBySlug.get(b.slug);
        return raw && postNeedsRefresh(b, raw);
      })
      .map((b) => apiBySlug.get(b.slug)),
  );

  let toProcess = [];

  if (force) {
    toProcess = sortByPublishedAtAsc(strapiPosts.filter((p) => postSlug(p)));
  } else if (daily) {
    toProcess = [...newPosts.slice(0, 1), ...changedPosts];
  } else if (refresh) {
    toProcess = [...newPosts, ...changedPosts];
  } else if (all) {
    toProcess = newPosts;
  } else {
    toProcess = newPosts.slice(0, 1);
  }

  if (limit != null && toProcess.length > limit) {
    toProcess = toProcess.slice(0, limit);
  }

  return { toProcess, newPosts, changedPosts };
}

async function run() {
  const argv = process.argv.slice(2);
  const all = argv.includes('--all');
  const daily = argv.includes('--daily');
  const refresh = argv.includes('--refresh');
  const force = argv.includes('--force');
  const limit = parseLimit(argv);

  assertSiteFilterConfig();

  const apiUrl = process.env.STRAPI_API_URL || 'http://localhost:1337/api';

  console.log('Fetching posts from API...');
  const strapiPosts = await fetchPosts({ baseUrl: apiUrl });

  const existingBlogs = loadBlogsJson();
  const { toProcess, newPosts, changedPosts } = buildWorklist(strapiPosts, existingBlogs, {
    all, daily, refresh, force, limit,
  });

  if (toProcess.length === 0) {
    console.log('No articles to publish or refresh.');
    return;
  }

  const mode = force
    ? 'force'
    : daily
      ? 'daily'
      : refresh
        ? 'refresh'
        : all
          ? 'all new'
          : 'single new';

  console.log(
    `Mode: ${mode} — processing ${toProcess.length} article(s)` +
    ` (${newPosts.length} new, ${changedPosts.length} changed in API).`,
  );

  let blogs = [...existingBlogs];

  for (const raw of toProcess) {
    const slug = postSlug(raw);
    const isNew = !blogs.some((b) => b.slug === slug);
    const related = getRelatedSlugs(blogs, slug, {
      searchIntent: raw.search_intent,
      category: raw.category,
    });

    const normalized = normalizePost(raw, { relatedPosts: related });
    validatePost(normalized);

    console.log(`  - ${isNew ? 'create' : 'update'}: ${normalized.title} (${slug})`);
    renderArticle(normalized, { blogs });

    const entry = toBlogsEntry(normalized, raw);
    upsertBlogEntry(blogs, entry);
  }

  blogs.sort(sortBlogsByLatestSyncFirst);
  saveBlogsJson(blogs);
  generateSitemap();
  console.log('Done. blogs.json and sitemap.xml updated.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
