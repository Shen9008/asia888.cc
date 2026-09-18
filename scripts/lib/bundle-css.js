'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const CSS_DIR = path.join(ROOT, 'css');
const SOURCES = [
  'variables.css',
  'base.css',
  'components.css',
  'layouts.css',
  'sections.css',
  'animations.css',
  'content-layouts.css',
];

function bundleCss(opts = {}) {
  const outPath = opts.outPath || path.join(CSS_DIR, 'site.css');
  const parts = SOURCES.map((name) => {
    const file = path.join(CSS_DIR, name);
    return `/* === ${name} === */\n${fs.readFileSync(file, 'utf8').trim()}\n`;
  });
  const banner = `/* Generated from css/{${SOURCES.join(', ')}} — do not edit by hand. */\n`;
  fs.writeFileSync(outPath, banner + parts.join('\n'), 'utf8');
  return outPath;
}

module.exports = { bundleCss, SOURCES };
