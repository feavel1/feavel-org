---
version: 1
slug: 'src-routes-services'
primary_target: 'src/routes/services'
related_targets:
  [
    'src/routes/services/+page.svelte',
    'src/lib/services/Portfolio.svelte',
    'src/lib/services/ContactForm.svelte',
    'src/routes/layout.css'
  ]
---

## Services page (`/services`)

### Scope & Mode

Persuade. The visitor decides whether to hire Feavel for music production, translation, or web development. Single-page narrative with portfolio detail sub-route.

### Audience & Job

Founders, creative directors, artists, and labels evaluating multidisciplinary talent. Primary job: understand Feavel's range, see proof of work, and initiate contact.

### Action

Contact form submission or direct email. Lower-funnel conversions start from portfolio entries that link to full-rich-content detail pages.

### Chosen Direction

**Gothic × Neon: Stained Glass** — Gothic cathedral aesthetic with jewel-toned neon accents. Three discipline colors: emerald (web), sapphire (translation), ruby (music). Dark stone base with warm undertone. Print grain overlay at 3-4% opacity. Bebop Title Card composition: asymmetric color bars, oversized grotesk caps at negative tracking, numbered index strip, track reel portfolio.

### Memorable Moment

First viewport: dark stone field with "FEAVEL" in 8xl colliding caps, emerald diagonal bar and ruby bottom field behind it. Three gem-toned discipline chips as an index strip. The page feels like a session reel — hard cuts between service frames, each with a 6px jewel-toned color bar, oversized ghost number, and Bebop-style metadata.

### Global Impact

The Gothic × Neon palette replaced the Darkroom monochrome across the entire application via `src/routes/layout.css` custom properties. All ~29 shadcn-svelte components inherit the new tokens with zero component-level changes. The palette uses OKLCH throughout: `--primary` is emerald green, `--destructive` is ruby red, background is warm dark stone.

### Constraints

- Surface-specific CSS in `$lib/services/bebop.css` — grain, discipline bars, index chips
- Palette tokens live in `layout.css` as CSS custom properties
- Portfolio entries are hard-coded in `$lib/services/data.ts` with post IDs linking to Convex
- Contact form preserves existing Convex mutation and toast behavior
- Dark mode is the primary mode; light mode is "day cathedral" (pale stone, deeper jewel tones)

### Unresolved

- Whether to keep Geist and Oxanium font imports (unused in any surface)
