'use strict';

require('./load-env.js');

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const SITEMAP_PATH = path.join(ROOT, 'sitemap.xml');
const BLOGS_JSON_PATH = path.join(ROOT, 'assets/data/blogs.json');

/**
 * Canonical blog index URL prefix (SITE_BASE_URL + BLOG_BASE_PATH).
 * Uses the URL API so a path like `blog` cannot concatenated-merge into `https://asia888.ccblog/`.
 */
function blogBaseUrl() {
  const originStr = process.env.SITE_BASE_URL || 'https://asia888.cc';
  const origin = new URL(originStr.endsWith('/') ? originStr : `${originStr}/`);
  let seg = String(process.env.BLOG_BASE_PATH != null ? process.env.BLOG_BASE_PATH : 'blog').trim();
  seg = seg.replace(/^\/+|\/+$/g, '');
  if (!seg) seg = 'blog';
  return new URL(`${seg}/`, origin).href;
}

const MARK_START = '  <!-- Blog Posts -->';
const MARK_END = '  <!-- /Blog Posts -->';

/**
 * Rebuilds the blog section of sitemap.xml from blogs.json.
 * Preserves all non-blog URL entries.
 */
function generateSitemap(opts = {}) {
  const sitemapPath = opts.sitemapPath || SITEMAP_PATH;
  const blogsPath = opts.blogsPath || BLOGS_JSON_PATH;

  let blogs = [];
  try {
    const raw = fs.readFileSync(blogsPath, 'utf8');
    blogs = JSON.parse(raw);
    if (!Array.isArray(blogs)) blogs = [];
  } catch (err) {
    throw new Error(`Failed to read blogs.json: ${err.message}`);
  }

  let sitemap = fs.readFileSync(sitemapPath, 'utf8');

  const blogSectionStart = sitemap.indexOf(MARK_START);
  const blogSectionEnd = sitemap.indexOf(MARK_END, blogSectionStart);

  if (blogSectionStart < 0 || blogSectionEnd < 0) {
    throw new Error(
      `Could not find blog markers in sitemap.xml (expected "${MARK_START.trim()}" and "${MARK_END.trim()}").`,
    );
  }

  const before = sitemap.slice(0, blogSectionStart + MARK_START.length);
  const after = sitemap.slice(blogSectionEnd);

  const base = blogBaseUrl();

  const blogUrls = blogs.map((b) => {
    const slug = b.slug || '';
    const lastmod = b.published_date || '2025-01-01';
    return `  <url>
    <loc>${base}${slug}/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
  }).join('\n');

  const inner = blogs.length ? `\n${blogUrls}\n` : '\n';
  const updated = before + inner + after;
  fs.writeFileSync(sitemapPath, updated, 'utf8');
  return sitemapPath;
}

module.exports = { generateSitemap };
