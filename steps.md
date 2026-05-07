# Blog / posts sync – setup guide

Steps to run the static blog generation pipeline on this repo or to replicate it on another site.

---

## Quickstart (new project in a few minutes)

1. Copy **`scripts/`** (whole tree), **`assets/data/blogs.json`** (start with `[]`), **`blog/`** listing, **`js/blog-loader.js`**, and **`sitemap.xml`** baseline — or clone this repo as a template.
2. **`npm install dotenv form-data glob sharp`** (add `wrangler` only if you deploy with it).
3. Copy **`.env.example`** → **`.env.local`** and set **`STRAPI_API_URL`**, **`SITE_DOMAIN`** (if multi-tenant), and **`STRAPI_API_TOKEN`** if needed.
4. Run **`npm run sync:doctor`** — confirms env is read and prints a sample **`GET`** URL (no network call).
5. Run **`npm run sync:all`** then **`npm run backfill:force`**.
6. Tune **`article.template.html`**, **`normalize-post.js`**, or env **`POSTS_COLLECTION`** / **`POSTS_SITE_FILTER_KEY`** if your CMS uses different names.

---

## 1. Prerequisites

- Node.js 20+ (24 recommended)
- npm
- Strapi (or compatible) HTTP API exposing a **posts** collection with pagination
- Static site project (HTML/CSS/JS)

---

## 2. Copy project structure

Copy these folders and files into your project:

```
your-site/
├── scripts/
│   ├── content-sync.js          # Fetches API posts, renders articles
│   ├── sync-doctor.js           # Prints env + sample GET URL (no network)
│   ├── backfill-internal-links.js
│   ├── backfill-related-posts-block.js
│   ├── audit-internal-links.js
│   ├── lib/
│   │   ├── fetch-posts.js       # GET /{POSTS_COLLECTION} + optional site filter
│   │   ├── normalize-post.js
│   │   ├── render-article.js
│   │   ├── inject-internal-links.js
│   │   └── generate-sitemap.js
│   └── templates/
│       └── article.template.html
├── blog/                         # Output dir for article pages
│   └── index.html               # Blog listing (static)
├── assets/
│   └── data/
│       └── blogs.json           # Created/updated by sync (or start with [])
├── sitemap.xml                  # Existing sitemap (script appends blog URLs)
├── .env.local                   # Create locally (gitignored)
└── .env.example                 # Documented variable names (optional)
```

---

## 3. Install dependencies

Add to `package.json` or run:

```bash
npm install dotenv form-data glob sharp wrangler --save-dev
```

---

## 4. Environment variables

Create `.env.local` in the project root (see root `.env.example` for names):

| Variable | Required | Purpose |
|----------|----------|---------|
| `STRAPI_API_URL` | Yes for sync | API base including `/api`, e.g. `http://host/api` or `https://cms.example.com/api` |
| `STRAPI_API_TOKEN` | If API uses auth | Sent as `Authorization: Bearer …` |
| `SITE_DOMAIN` or `site_domain` | Multi-tenant CMS | Value for the site filter (default key: `filters[site][domain][$eq]`). If omitted and `SKIP_POSTS_SITE_FILTER` is not set, sync runs unfiltered and logs a warning. |
| `POSTS_COLLECTION` | No | REST collection segment after `/api/` (default: `posts`). |
| `POSTS_SITE_FILTER_KEY` | No | Full query parameter **name** for the domain filter (default: `filters[site][domain][$eq]`). Set to empty to omit the filter param only. |
| `SKIP_POSTS_SITE_FILTER` | No | If `1` / `true` / `yes`, never send a domain filter (single-tenant APIs). |

Optional for Cloudflare deploy (CLI):

```
CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_ACCOUNT_ID=...
```

---

## 5. API contract

**Request**

- Method: `GET`
- URL: `{STRAPI_API_URL}/{POSTS_COLLECTION}` (default collection: `posts`)
- Query (pagination & sort, Strapi-style):

  - `sort=publishedAt:asc`
  - `pagination[page]`, `pagination[pageSize]` (page size 100 in code)

- Query (site scope, when domain filtering is active — see env above):

  - `{POSTS_SITE_FILTER_KEY}={SITE_DOMAIN}` (default key: `filters[site][domain][$eq]`)

**Response**

- Expected shape: Strapi v4-style JSON with `data[]`, optional `meta.pagination`, and per-item `attributes` (or flat fields). `fetch-posts.js` normalises entries to plain objects for `normalize-post.js`.

If your collection name or filter shape differs, set **`POSTS_COLLECTION`** and **`POSTS_SITE_FILTER_KEY`** (or run unfiltered with **`SKIP_POSTS_SITE_FILTER=1`**). Use **`npm run sync:doctor`** to verify the built URL before syncing.

---

## 6. Post fields (Strapi → site)

Your content type should expose these fields, or adapt `normalize-post.js`:

| Field | Type | Notes |
|-------|------|-------|
| `slug` | string | URL slug |
| `title` | string | Article title |
| `content` | string or rich text | HTML or blocks |
| `shortDescription` / `excerpt` | string | Summary |
| `meta_title` | string | SEO title |
| `meta_description` | string | Meta description |
| `primary_keyword` / `focus_keyword` | string | Focus keyword |
| `search_intent` | string | navigational \| commercial \| transactional \| informational |
| `reading_time` | number/string | e.g. "5 min read" |
| `publishedAt` | datetime | Publish date |
| `updatedAt` | datetime | Last updated |
| `toc_json` | array | Table of contents (optional) |
| `placeholder_gradient` | string | CSS gradient (optional) |
| `keywords` | string/array | Used for internal linking |

---

## 7. Article template

`scripts/templates/article.template.html` uses these placeholders:

| Placeholder | Description |
|-------------|-------------|
| `{{META_TITLE}}` | SEO title |
| `{{META_DESCRIPTION}}` | Meta description |
| `{{KEYWORDS}}` | Meta keywords |
| `{{SLUG}}` | URL slug |
| `{{TITLE}}` | Article title |
| `{{CATEGORY}}` | Category label |
| `{{PUBLISHED_DATE_ISO}}` | YYYY-MM-DD |
| `{{PUBLISHED_DATE_FORMATTED}}` | Long date |
| `{{UPDATED_DATE_ISO}}` | YYYY-MM-DD |
| `{{READING_TIME}}` | e.g. "5 min read" |
| `{{EXCERPT}}` | Summary text |
| `{{PLACEHOLDER_GRADIENT}}` | CSS gradient |
| `{{FOCUS_KEYWORD}}` | Focus keyword |
| `{{TOC_HTML}}` | Table of contents |
| `{{ARTICLE_BODY}}` | Main content HTML |
| `{{SHARE_URL}}` | Canonical URL |
| `{{SHARE_TITLE}}` | Encoded title |
| `{{FAQ_SCHEMA_SCRIPT}}` | FAQ JSON-LD (optional) |

Use your site’s HTML layout and styles in the template.

---

## 8. Blog listing page

`blog/index.html` should:

- Load posts from `assets/data/blogs.json`
- Use `js/blog-loader.js` (or equivalent) to render the grid
- Match the data shape: `{ slug, title, excerpt, category, published_date, ... }`

---

## 9. Package.json scripts

```json
{
  "scripts": {
    "sync": "node scripts/content-sync.js",
    "sync:all": "node scripts/content-sync.js --all",
    "sync:doctor": "node scripts/sync-doctor.js",
    "backfill": "node scripts/backfill-internal-links.js",
    "backfill:force": "node scripts/backfill-internal-links.js --force",
    "audit:links": "node scripts/audit-internal-links.js",
    "deploy": "wrangler pages deploy . --project-name=YOUR_PROJECT"
  }
}
```

---

## 10. What gets generated

| Step | Command | Generates/updates |
|------|---------|-------------------|
| Sync | `npm run sync` | Fetches new posts from API, renders `blog/{slug}/index.html`, appends to `blogs.json`, updates `sitemap.xml` |
| Sync all | `npm run sync:all` | Same as sync, but processes every not-yet-seen post in one run |
| Doctor | `npm run sync:doctor` | Prints env-backed config and a sample `GET` URL (offline) |
| Backfill | `npm run backfill` | Adds internal links to existing articles (new articles only) |
| Backfill force | `npm run backfill:force` | Strips and re-injects internal links in all articles |
| Audit | `npm run audit:links` | Reports link count per article (read-only) |

---

## 11. Typical workflow

**First-time setup**

1. Create `assets/data/blogs.json` as `[]` (empty array)
2. Ensure `sitemap.xml` exists with a `</urlset>` closing tag
3. Configure `.env.local` (`STRAPI_API_URL`, optional token, `SITE_DOMAIN` or `SKIP_POSTS_SITE_FILTER`)
4. Run `npm run sync:doctor` and confirm the sample URL matches your CMS
5. Align `article.template.html` with your layout
6. Run `npm run sync:all` to fetch and render all posts for the configured site
7. Run `npm run backfill:force` to inject internal links

**Ongoing (e.g. daily via CI)**

1. `npm run sync` – fetch and render new posts
2. `npm run backfill:force` – refresh internal links across articles
3. Commit and push changes
4. `npm run deploy` – deploy to Cloudflare Pages (if using Wrangler)

---

## 12. GitHub Actions

Workflow: `.github/workflows/daily-sync.yml`.

**Repository secrets**

- `STRAPI_API_URL` – e.g. `http://host/api` or `https://cms.example.com/api`
- `STRAPI_API_TOKEN` – if the API requires a bearer token
- `SITE_DOMAIN` – e.g. `m99game.com` when using the default `filters[site][domain][$eq]` filter

Optional: add **`POSTS_COLLECTION`**, **`POSTS_SITE_FILTER_KEY`**, or **`SKIP_POSTS_SITE_FILTER`** to the workflow `env:` block if a project needs them (mirror your `.env.local`).

Deploy secrets (`CLOUDFLARE_*`) are only needed if the workflow deploys from Actions; this repo’s workflow commits generated files only.

---

## 13. blogs.json fields

Each entry in `blogs.json` should have:

- `slug`, `title`, `meta_title`, `meta_description`, `focus_keyword`
- `category`, `search_intent`, `published_date`, `reading_time`
- `excerpt`, `placeholder_gradient`, `related_posts`, `keywords`

The `keywords` array feeds internal link injection. Add 4–8 phrases per post for best results.

---

## 14. Related docs

- Design tokens and layout: `brand.md`
- CSS entry: `css/main.css` (tokens, components, base)
