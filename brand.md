# Asia888 — Brand & UI system

Authoritative reference for **asia888.cc**: how color, type, layout, sections, and components are implemented in CSS. When you change tokens, update [`css/variables.css`](css/variables.css) first, then mirror any narrative shifts here.

**Stack:** static HTML with shared [`partials/`](partials/) (`header.html`, `footer.html`), global styles under [`css/`](css/), and [`js/load-partials.js`](js/load-partials.js) for injection where used.

---

## 1. Visual identity (teal, gold, midnight)

Palette summary from `variables.css`: **midnight slate backgrounds**, **teal as primary UI accent** (CTAs, borders, glow), **gold and cyan as secondary accents** (gradients, highlights—not a single-accent site).

| Role | Token(s) | Notes |
|------|-----------|--------|
| Deepest page wash | `--bg-darkest` | Default `body` background |
| Elevated bands / cards | `--bg-darker`, `--bg-dark`, `--bg-card`, `--bg-card-hover`, `--bg-elevated` | Cards often use `--gradient-card` |
| Primary text | `--text-primary` | Headings and high-emphasis UI |
| Body / supporting | `--text-secondary` | Tinted teal-leaning copy on dark |
| Meta / captions | `--text-muted`, `--text-subtle` | |
| Primary accent | `--primary`, `--primary-dark`, `--primary-light`, `--primary-glow`, `--primary-subtle` | Links start at `--primary-light`; hover moves toward `--text-primary` per `base.css` |
| Secondary accents | `--accent-cyan`, `--accent-pink`, `--accent-gold` | Use sparingly (placeholders, badges, gradients) |
| Borders | `--border-subtle`, `--border-default`, `--border-strong` | |
| CTA surface | `--gradient-primary` | Teal gradient on `.btn--primary` |

Decorative mesh and text gradients: `--gradient-mesh`, `--gradient-text`. Shadows and motion: `--shadow-*`, `--transition-*`, `--ease-*`.

---

## 2. Typography

**Families** (`variables.css`)

- **Display / headings:** `var(--font-display)` — Syne, with Outfit fallback.
- **Body / UI:** `var(--font-body)` — Outfit, system fallback.

**Global heading scale** (`base.css`, mobile first then `min-width: 768px`)

| Level | Default | ≥768px |
|-------|---------|--------|
| `h1` | `2.25rem` | `3.5rem` |
| `h2` | `1.875rem` | `2.5rem` |
| `h3` | `1.5rem` | `1.75rem` |
| `h4` | `1.25rem` | (unchanged) |

**Body:** `body` uses `line-height: 1.6`; size follows browser/root default unless a component sets it.

**Section chrome:** `.section__title` and `.section__subtitle` use their own sizes (`base.css`); `.section__badge` is uppercase with wide tracking. **Gradient headlines:** `.text-gradient` uses `--gradient-text`.

Avoid one-off heading sizes on new pages; extend `base.css` if a new level is truly needed.

---

## 3. Layout: container & vertical rhythm

**`.container`** (`base.css`)

- `max-width: 1280px`, centered.
- Horizontal padding: `1rem` → `1.25rem` (≥480px) → `2rem` (≥768px).

**`.section`** (`base.css`)

- Vertical padding: `3rem` (≤479px), `4rem` (default), `6rem` (≥768px).
- **`.section__header`** — `margin-bottom: 3rem`; **`.section__header--centered`** — centered, `max-width: 600px`.

There is **no** `--space-*` token scale in `variables.css` today; spacing is expressed in `rem` on components. Prefer reusing these section/container patterns or matching nearby values before inventing new intervals.

---

## 4. Border radius

All radii are tokens from `variables.css`:

| Token | Value | Typical use |
|-------|--------|--------------|
| `--radius-sm` | `6px` | Small controls, tight clusters |
| `--radius-md` | `12px` | **Default `.btn`**, medium panels |
| `--radius-lg` | `16px` | **`.game-card`**, larger surfaces |
| `--radius-xl` | `24px` | Hero-scale panels if needed |
| `--radius-2xl` | `32px` | Large shells |
| `--radius-full` | `9999px` | Pills / fully rounded controls |

**Rule of thumb:** buttons stay **`--radius-md`**; cards and prominent containers gravitate to **`--radius-lg`** so CTAs read slightly tighter than content frames.

---

## 5. Buttons

Structure: **`.btn`** + optional **`.btn--primary`**, **`.btn--outline`**, **`.btn--lg`**, **`.btn--glow`** (`components.css` + `animations.css`).

| Class | Role |
|--------|------|
| `.btn--primary` | Main CTAs — teal `--gradient-primary`, white label, lift + glow on hover |
| `.btn--outline` | Secondary — transparent, `--border-strong`, fills with `--primary-subtle` on hover |
| `.btn--lg` | Larger padding and `1rem` label |
| `.btn--glow` | Optional attention — looping pulse (disabled when `prefers-reduced-motion: reduce`) |

Base `.btn`: uppercase, `font-weight: 600`, `letter-spacing: 0.05em`, `border-radius: var(--radius-md)`, `min-height: 44px` on small viewports.

**Note:** `.btn--gold` is not defined in site CSS; use `.btn--primary` / `.btn--outline` (or add a variant in `components.css` if product needs a dedicated gold button).

---

## 6. Cards & interactive tiles

**`.game-card`** (`components.css`): `--gradient-card`, `--radius-lg`, `--border-default`, hover lift and `--shadow-card`. Placeholder stripes mix teal, gold, cyan, and pink for variety—keep that accent balance in new assets.

Other promotional/tile patterns live in `sections.css` and `content-layouts.css`; follow existing BEM blocks rather than new ad-hoc class names.

---

## 7. Long-form / SEO copy

For article-style or bottom-of-page blocks, the canonical pattern is **`.seo-content`** (`sections.css`): header (`.seo-content__header`), lead (`.seo-content__lead`), and prose (`.seo-content__body` with `h2`/`h3`/`p`/`ul`/`a` styles). Links are underlined with `--primary-light` → `--text-primary` on hover.

---

## 8. Partials & DRY checklist

1. **Chrome:** reuse `partials/header.html` and `partials/footer.html` on new pages.
2. **Colors:** use semantic tokens above, not raw hex, unless adding a new token.
3. **Radius:** stick to `--radius-*` or `--radius-full`.
4. **Sections:** `.section` + `.container` + `.section__header` / `.section__title` / `.section__subtitle` for new bands.
5. **CTAs:** `.btn` + primary or outline (+ optional `--lg` / `--glow`).

---

*Update this file whenever you change global tokens or shared component contracts so the doc and stylesheet stay in sync.*
