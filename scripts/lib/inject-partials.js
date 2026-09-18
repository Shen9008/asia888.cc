'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const HEADER_PATH = path.join(ROOT, 'partials/header.html');
const FOOTER_PATH = path.join(ROOT, 'partials/footer.html');

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.wrangler',
  'partials',
  'assets',
  'images',
  'css',
  'js',
  '.cursor',
  '.wrangler',
]);

function walkHtml(dir, out = []) {
  const roots = [
    dir,
    path.join(dir, 'blog'),
    path.join(dir, 'author'),
    path.join(dir, 'scripts', 'templates'),
  ];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    const stat = fs.statSync(root);
    if (stat.isFile() && root.endsWith('.html')) {
      out.push(root);
      continue;
    }
    if (!stat.isDirectory()) continue;
    const names = fs.readdirSync(root);
    for (const name of names) {
      const full = path.join(root, name);
      const st = fs.statSync(full);
      if (root === dir) {
        if (st.isFile() && name.endsWith('.html')) out.push(full);
        continue;
      }
      if (st.isDirectory()) {
        for (const nested of fs.readdirSync(full)) {
          if (nested.endsWith('.html')) out.push(path.join(full, nested));
        }
      } else if (name.endsWith('.html')) {
        out.push(full);
      }
    }
  }
  return out;
}

function wrap(kind, html) {
  return `<!--ssr:partial-${kind}-->\n${html.trim()}\n<!--/ssr:partial-${kind}-->`;
}

function injectInto(html, header, footer) {
  const headerBlock = wrap('header', header);
  const footerBlock = wrap('footer', footer);

  let next = html;
  if (next.includes('<!--ssr:partial-header-->')) {
    next = next.replace(
      /<!--ssr:partial-header-->[\s\S]*?<!--\/ssr:partial-header-->/,
      headerBlock,
    );
  } else {
    next = next.replace(
      /<div id="partial-header">\s*<\/div>/,
      headerBlock,
    );
  }

  if (next.includes('<!--ssr:partial-footer-->')) {
    next = next.replace(
      /<!--ssr:partial-footer-->[\s\S]*?<!--\/ssr:partial-footer-->/,
      footerBlock,
    );
  } else {
    next = next.replace(
      /<div id="partial-footer">\s*<\/div>/,
      footerBlock,
    );
  }

  return next;
}

function injectPartials(opts = {}) {
  const root = opts.root || ROOT;
  const header = fs.readFileSync(HEADER_PATH, 'utf8');
  const footer = fs.readFileSync(FOOTER_PATH, 'utf8');
  const files = walkHtml(root);
  let changed = 0;
  for (const file of files) {
    const before = fs.readFileSync(file, 'utf8');
    const after = injectInto(before, header, footer);
    if (after !== before) {
      fs.writeFileSync(file, after, 'utf8');
      changed += 1;
    }
  }
  return { files: files.length, changed };
}

module.exports = { injectPartials, injectInto, walkHtml };
