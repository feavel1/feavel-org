---
target: /posts
total_score: 27
max_score: 40
na_heuristics:
p0_count: 1
p1_count: 2
timestamp: 2026-07-26T13-12-58Z
slug: src-routes-posts
---

# Critique: /posts

## Design Health Score

| #         | Heuristic                       | Score     | Key Issue                                                                                                     |
| --------- | ------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------- |
| 1         | Visibility of System Status     | 3         | No result count after filtering; payment beyond "Processing..." unknown                                       |
| 2         | Match System / Real World       | 3         | "USDC" unexplained; functional labels otherwise                                                               |
| 3         | User Control and Freedom        | 4         | URL-driven state, back/forward works, tag deselect with X                                                     |
| 4         | Consistency and Standards       | 2         | 6× border-border vs system ring-1 standard; font-heading unused on post titles                                |
| 5         | Error Prevention                | 3         | Comment button disabled when empty; pay button disabled; no confirmation before payment                       |
| 6         | Recognition Rather Than Recall  | 3         | Tag toggles clear; "Members" badge unexplained; ShareButton hidden behind hover                               |
| 7         | Flexibility and Efficiency      | 3         | URL bookmarks enabled; no keyboard nav between posts; no search-within-post                                   |
| 8         | Aesthetic and Minimalist Design | 2         | Zero jewel-tone application; zero font-heading on post titles; pay gate generic; sidebar reads as admin panel |
| 9         | Error Recovery                  | 3         | x402 error inline; "Post not found" shown; comment failures silently swallowed                                |
| 10        | Help and Documentation          | 1         | No tooltips, no payment how-to, no "Members" explanation, no empty-state coaching                             |
| **Total** |                                 | **27/40** | **Acceptable**                                                                                                |

## Design Specificity Verdict

**LLM assessment (Assessment A):** The posts page reads as a generic shadcn-svelte blog template with an emerald primary accent. The Gothic × Neon system (jewel tones, dark stone warmth, stained-glass grammar, oversize grotesk, ring-not-border) is entirely absent. Post titles use `font-medium` (Inter) instead of `font-heading` (EB Garamond). Zero `--chart-1` through `--chart-5` references exist. The pay gate is a generic dashed-border box. The sidebar uses 6 instances of `border-border` where the design system uses `ring-1 ring-foreground/10`. The page is functional but emotionally flat — it could belong to any SaaS, not Feavel's workshop.

**Deterministic scan (Assessment B):**

- CLI detector: 1 advisory (text-[11px] off type ramp at line 214)
- Ring-Not-Border: 6 `border-border` violations, 0 `ring-1` usages
- Spacing: 0 `space-x/y` violations (all `gap-*`) ✅
- Skeleton: 0 raw `animate-pulse` divs (all `<Skeleton>` components) ✅
- Semantic tokens: 0 raw colors (all Tailwind semantic tokens) ✅
- Garamond Restraint: 0 `font-heading`/`eb-garamond` in file ✅
- Assessment B confirmed no browser overlay injection was possible (no browser automation in this session)

## Overall Impression

The posts page is functionally sound — loading states, URL-driven navigation, pagination, and the pay gate all work. But it's a blank canvas in a cathedral. The Gothic × Neon world is loaded in `layout.css` and waiting; the posts page hasn't acknowledged it exists. A 10-minute pass applying jewel tones, `font-heading` on titles, and ring-not-border would transform it from "any SaaS blog" to "Feavel's reading room."

## Strengths

1. **URL-driven state**: postId, tags, category synced to URL. Every state is shareable, back/forward works natively. Exceptional user control.
2. **Loading state coverage**: Skeletons for posts and comments, "Loading more..." indicator, disabled buttons during payment. Comprehensive.
3. **Clean spacing and token usage**: Zero `space-x/y` violations, zero raw colors, all Skeleton usage correct. The spacing and color conventions are fully adopted.

## Priority Issues

### P0 — Ring-Not-Border violation (6 instances)

Lines 135, 164, 183, 249, 270, 302. Every card, container, and comment uses `border-border`. The design system uses `ring-1 ring-foreground/10`. Fix: replace all `border border-border` with `ring-1 ring-foreground/10`. For tag buttons at 164/183, the button-outline spec creates ambiguity — resolve at DESIGN.md level.

### P1 — Jewel tones and font-heading absent

The Gothic × Neon palette (`--chart-1` emerald, `--chart-2` sapphire, `--chart-3` ruby) is defined but never applied. Post titles use `font-medium` (Inter) instead of `font-heading` (EB Garamond). Fix: apply `font-heading` to post titles in sidebar and reader; use chart colors for category badges or the selected-post indicator.

### P1 — Pay gate is visually disconnected

Lines 249-267. Dashed border, gray circle, flat text. No Gothic × Neon atmosphere. Fix: jewel-toned ring, subtle glow on the pay button, `font-heading` on the title.

### P2 — Developer-facing page description

Line 113. Fallback says "Public reader with rich-text editor, caching, and mobile drawers" — visitors see implementation details. Fix: "Browse posts from Feavel's workshop" or similar.

### P2 — No filter result count

After filtering, user has no idea how many results matched. A simple count reduces cognitive load and confirms the filter worked.

### P3 — Generic comment section

Comments use `border-border bg-card` — same generic treatment as everything else. No personality.

## Persona Red Flags

**Jordan (First-Timer):** Page description reads as developer docs. "USDC" unexplained in pay gate. "Members" badge with no tooltip. No guidance beyond "Select a post to read." High abandonment risk for non-technical visitors.

**Alex (Power User):** No keyboard shortcuts to navigate between posts. ShareButton hidden behind hover — must discover by accident. No search-by-title, only tags/category. No post sorting options.

## Minor Observations

- Tag button: X icon at 10px is nearly invisible
- `tabindex="-1" role="button"` on share wrapper — a11y workaround, ShareButton should handle this
- Comment reaction errors silently swallowed
- Sidebar height discrepancy: outer `-300px` vs inner `-200px` — could cause double-scroll
- No vertical separator between sidebar and content on desktop

## Questions

1. Should the sidebar adopt the Card component or stay custom? Card already implements ring + font-heading — adopting it fixes P0 and P1 simultaneously but has different padding/gap.
2. Is the Gothic × Neon aesthetic compatible with a reading surface? Stained glass competes with text readability. Should the reader area remain minimal while the chrome carries atmosphere?
