'use strict';

const fs = require('fs');
const path = require('path');
const { walkHtml, injectPartials } = require('./lib/inject-partials.js');
const { bundleCss } = require('./lib/bundle-css.js');

const ROOT = path.resolve(__dirname, '..');
const CSS_HREF = '/css/site.css?v=20260918';
const BYLINE =
  '        <p class="page-byline">Reviewed by <a href="/author/leonard-du">Leonard Du</a>, Senior Casino Specialist. Last reviewed Sep 2026. Affiliate information — see <a href="/about">About</a>.</p>';

const URL_PAGES =
  'slots|live-casino|sports|promotions|faq|terms-conditions|privacy-policy|about';

const PRELOAD_BY_FILE = {
  'slots.html': '/assets/img/banners/slots.webp',
  'live-casino.html': '/assets/img/banners/live-casino.webp',
  'sports.html': '/assets/img/banners/sports.webp',
  'promotions.html': '/assets/img/banners/promo.webp',
  'faq.html': '/assets/img/banners/faq.webp',
  'about.html': '/assets/img/banners/faq.webp',
  'terms-conditions.html': '/assets/img/banners/faq.webp',
  'privacy-policy.html': '/assets/img/banners/faq.webp',
  '404.html': '/assets/img/banners/faq.webp',
};

const UNLAZY_FILES = new Set([
  'index.html',
  'slots.html',
  'live-casino.html',
  'sports.html',
  'promotions.html',
]);

function rewritePrettyUrls(html) {
  return html
    .replace(
      new RegExp(`https://asia888\\.cc/(${URL_PAGES})\\.html`, 'g'),
      'https://asia888.cc/$1',
    )
    .replace(
      new RegExp(`(href|content)="/(${URL_PAGES})\\.html`, 'g'),
      '$1="/$2',
    )
    .replace(
      new RegExp(`href="/(${URL_PAGES})\\.html`, 'g'),
      'href="/$1',
    );
}

function replaceStylesheets(html) {
  if (!html.includes('css/variables.css')) return html;
  return html.replace(
    /(?:[ \t]*<link rel="stylesheet" href="\/?css\/(?:variables|base|components|layouts|sections|animations|content-layouts)\.css(?:\?v=[^"]*)?">\r?\n?)+/g,
    `    <link rel="stylesheet" href="${CSS_HREF}">\n`,
  );
}

function addOgDimensions(html) {
  if (html.includes('og:image:width') || !html.includes('property="og:image"')) {
    return html;
  }
  return html.replace(
    /(<meta property="og:image" content="[^"]+">)/,
    '$1\n    <meta property="og:image:width" content="567">\n    <meta property="og:image:height" content="557">',
  );
}

function addSkipLink(html) {
  if (html.includes('skip-link') || !html.includes('<body')) return html;
  return html.replace(
    /<body([^>]*)>/,
    '<body$1>\n    <a class="skip-link" href="#main-content">Skip to content</a>',
  );
}

function addReviewerUrl(html) {
  if (!html.includes('#reviewer-leonard-du')) return html;
  if (html.includes('https://asia888.cc/author/leonard-du')) return html;
  return html.replace(
    /("@id": "https:\/\/asia888\.cc\/#reviewer-leonard-du",\s*"name": "Leonard Du")/,
    '$1,\n                "url": "https://asia888.cc/author/leonard-du"',
  );
}

function addHeroPreload(html, basename) {
  const src = PRELOAD_BY_FILE[basename];
  if (!src) return html;
  if (html.includes(`href="${src}"`) && html.includes('rel="preload"')) return html;
  if (!html.includes('rel="canonical"')) return html;
  return html.replace(
    /(<link rel="canonical"[^>]*>)/,
    `$1\n    <link rel="preload" as="image" href="${src}" fetchpriority="high">`,
  );
}

function unlazyFirst(html, count) {
  let i = 0;
  return html.replace(/ loading="lazy"/g, (match) => {
    i += 1;
    return i <= count ? ' fetchpriority="high"' : match;
  });
}

function addPageByline(html, rel) {
  if (rel === '404.html') return html;
  if (html.includes('page-byline')) return html;
  if (rel === 'index.html') {
    if (!html.includes('class="stats-bar"')) return html;
    return html.replace(
      /<section class="stats-bar"/,
      `${BYLINE}\n\n        <section class="stats-bar"`,
    );
  }
  if (html.includes('page-hero')) {
    return html.replace(
      /(<section class="page-hero[^"]*"[\s\S]*?<\/section>)/,
      `$1\n\n${BYLINE}`,
    );
  }
  if (html.includes('blog-article-hero__excerpt')) {
    return html.replace(
      /(<p class="blog-article-hero__excerpt">[\s\S]*?<\/p>)/,
      `$1\n          <p class="page-byline">Reviewed by <a href="/author/leonard-du">Leonard Du</a>, Senior Casino Specialist. Last reviewed Sep 2026.</p>`,
    );
  }
  return html;
}

function patchArticleAuthor(html) {
  if (!html.includes('"@type": "Article"')) return html;
  return html.replace(
    /"author": \{\s*"@type": "Organization",\s*"name": "Asia888",\s*"url": "([^"]+)"\s*\}/,
    `"author": {\n      "@type": "Person",\n      "name": "Leonard Du",\n      "url": "https://asia888.cc/author/leonard-du"\n    }`,
  );
}

function transformHtml(html, file) {
  const basename = path.basename(file);
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  let next = html;
  next = rewritePrettyUrls(next);
  next = next.replace(/property="og:locale" content="en_GB"/g, 'property="og:locale" content="en_MY"');
  next = replaceStylesheets(next);
  next = addOgDimensions(next);
  next = addSkipLink(next);
  next = addReviewerUrl(next);
  next = addHeroPreload(next, basename);
  const isHome = rel === 'index.html';
  if (UNLAZY_FILES.has(basename) && !rel.startsWith('blog/')) {
    next = unlazyFirst(next, 4);
  }
  if (isHome || PRELOAD_BY_FILE[basename] || rel.startsWith('blog/')) {
    next = addPageByline(next, rel);
  }
  if (rel.startsWith('blog/') && rel !== 'blog/index.html') {
    next = patchArticleAuthor(next);
  }
  return next;
}

function applySeoFixes() {
  console.log('bundling css…');
  bundleCss();
  console.log('walking html…');
  const files = walkHtml(ROOT);
  console.log('html files', files.length);
  let changed = 0;
  for (const file of files) {
    const before = fs.readFileSync(file, 'utf8');
    const after = transformHtml(before, file);
    if (after !== before) {
      fs.writeFileSync(file, after, 'utf8');
      changed += 1;
    }
  }
  console.log('html changed', changed);

  const xmlPath = path.join(ROOT, 'sitemap.xml');
  const xmlBefore = fs.readFileSync(xmlPath, 'utf8');
  const xmlAfter = rewritePrettyUrls(xmlBefore)
    .replace(
      /https:\/\/asia888\.cc\/(slots|live-casino|sports|promotions|faq|terms-conditions|privacy-policy)\.html/g,
      'https://asia888.cc/$1',
    );
  if (xmlAfter !== xmlBefore) fs.writeFileSync(xmlPath, xmlAfter, 'utf8');

  const injected = injectPartials();
  return { htmlChanged: changed, injected };
}

if (require.main === module) {
  const result = applySeoFixes();
  console.log(JSON.stringify(result, null, 2));
}

module.exports = { applySeoFixes, transformHtml, rewritePrettyUrls };
