# Posts feed filters — handoff

**Status: working, uncommitted, one open design decision.** The four reported bugs are fixed and
verified in a real browser; the code is in the working tree only (nothing committed, nothing stashed).
A follow-up decision about the count chip is pending — see [Open decision](#open-decision).

Original complaints, in the reporter's words:

1. Tag chips offered under a category that has no posts carrying them (e.g. `技术` → `目的论`), so a
   reader could select a tag and land on nothing.
2. Picking a category whose posts rank beyond the current page showed only the few matches that
   happened to be in page 1; the rest needed a "load more" click.
3. Selecting a tag reset `category` in the URL while the list stayed filtered by it.
4. Deselecting a category or tag did not update the URL.

## Diagnosis: four symptoms, two root causes

### Cause A — backend filtered _after_ cutting the page

`src/convex/model/posts/metadata.ts` called `.paginate()` on the unfiltered `visibility` index, then
filtered the page in memory. Page 1 was therefore "5 newest public posts, minus non-matching": a
category with posts at rank 6+ returned a page of one, and `load more` fetched the rest. Same shape
for the chips: `listDistinctTags` took no category argument, so it offered every tag in the database.

Fixed by moving the filter **before** the slice (`listPublicPostsMatching` + an offset cursor) and
giving `listDistinctTags` an optional `category`.

### Cause B — three `$effect`s writing the same URL from a stale base

The old page had `syncUrl('postId')`, `syncUrl('tags')`, `syncUrl('category')`, each rebuilding the
URL from `page.url`. `page.url` only updates _after_ `goto` resolves, so every writer used a base that
predated its neighbours' writes; last writer won, which is exactly how `category` disappeared when a
tag was set. Once URL and local state disagreed, "deselect" produced a search string equal to what was
already there and the `url.search === lastSearch` guard skipped the write entirely (bug 4).

Fixed by deleting all four effects (three syncs + the seed effect) in favour of one `$state` object
with one writer. Details in [Frontend shape](#frontend-shape-as-of-this-handoff).

## Two framework facts that cost real time

Both were discovered by running the app, not by reading docs. Do not re-litigate them.

### 1. SvelteKit 3: `goto(url, { shallow: true })` does **not** update `page.url`

`update_state()` (`node_modules/@sveltejs/kit/src/runtime/client/client.js:2898`) writes
`history.replaceState`/`pushState` and then only:

```js
// client.js:2959
update_page({ state, shallow: { params, route, url } });
```

`page.url` keeps the URL of the **last real navigation**; the shallow target lives in
`page.shallow.url`. Consequences:

- Deriving filter state from `page.url` silently reads a stale URL after the first filter click. This
  was tried first and failed in the browser (URL changed, list did not).
- `page.shallow?.url ?? page.url` _does_ work mechanically, but is **not safe in this app**:
  `UserButton.svelte` and `OrganizationProfile.svelte` also use shallow routing for modals, so a
  shallow nav to a profile URL would make the posts page read that URL as its filters.

⇒ Filters are local `$state`, seeded once from `page.url`, and written out to the URL by one function.
The URL is never read back.

### 2. `convex-svelte@0.15.1` `useQuery` loses its data when args change and the result repeats

Reproduced in Chromium against the dev deployment (11 public posts, `audio` matches 2):

| step                                                       | list    | count chip                  |
| ---------------------------------------------------------- | ------- | --------------------------- |
| cold load `?tags=audio`                                    | 2 posts | `2 posts` ✓                 |
| click tag `ideological concepts` (still 2 matches)         | 2 posts | **gone, and never returns** |
| cold load `?category=essay` → switch to `pictures` (4 → 2) | correct | ✓ (values differed)         |

Mechanism (`node_modules/convex-svelte/dist/client.svelte.js`):

```js
// :127 — data comes from Convex's local cache, and `state.result` is the ONLY invalidation hook
const syncResult = $derived.by(() => {
	…
	let value = client.client.localQueryResult(getFunctionName(query), currentArgs);
	void state.result;
	return value;
});

// :82 — after an args change, syncResult has already returned undefined; if the new
// result is strictly equal to the previous one this write is a no-op, so nothing
// recomputes and `data` stays undefined forever, even though the cache is populated.
state.result = copy;
```

`usePaginatedQuery` has its own state machine and is **not** affected (`posts` update correctly on
every filter change). `useQuery` with static args is also fine. Only _changing_ args are exposed.

Relevant today:

- `countPublicPosts` on the feed — the chip vanishes in the equal-result case.
- `listTags({ category })` on the feed — if you switch between two categories that share the same tag
  set, the chips would vanish the same way.
- `listTags` / `listCategories` in `PostMetaPopover.svelte` and `routes/+page.svelte` use static args,
  so they are unaffected.

## Files in the working tree

| file                                  | state                                                                                              |
| ------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `src/lib/posts/ui/feed-filters.ts`    | **new** — pure `readFilters` / `writeFilters` / `toggleTag`, no state, no effects                  |
| `src/routes/posts/+page.svelte`       | rewritten script: one `$state` filter object, one writer; 3 sync effects + seed effect gone        |
| `src/lib/posts/ui/PostFilters.svelte` | `bind:` props replaced with plain props + `onCategoryChange` / `onTagToggle`; active styling added |
| `src/convex/model/posts/metadata.ts`  | filter-before-page, offset cursor, `countPublicPostsMatching`, tags scoped by category             |
| `src/convex/posts/queries.ts`         | `listTags{category}`, new `countPublicPosts`                                                       |

```
 src/convex/model/posts/metadata.ts           |  97 +++++++++++++++-------
 src/convex/posts/queries.ts                  |  21 ++++--
 src/lib/posts/ui/PostFilters.svelte          |  94 +++++++++----------
 src/routes/posts/+page.svelte                | 132 ++++++++++++-------------
```

`bunx svelte-check` → 0 errors / 0 warnings. `bunx eslint` on all touched files → clean. Two
_pre-existing_ lint errors in `+page.svelte` were fixed on the way (`goto` without `resolve()`, unused
`_` in an `{#each}` keyed by index).

### Frontend shape as of this handoff

```ts
// seeded from the query string once; never read back (see framework fact 1)
let filters = $state<FeedFilters>(readFilters(page.url));

function applyFilters(next: FeedFilters) {
	// the only URL writer
	filters = next;
	const url = writeFilters(page.url, next);
	void goto(resolve(`${url.pathname}${url.search}` as Path), {
		shallow: true,
		replace: true,
		state: page.state
	});
}
function setFilters(next: Partial<Omit<FeedFilters, 'postId'>>) {
	// filter changes close the post
	applyFilters({ ...filters, ...next, postId: null });
}
```

`PostFilters.svelte` is presentation-only: `{ category, selectedTags, tagOptions, categories, total,
onCategoryChange, onTagToggle }`. Selected state uses `const selectedTagSet = $derived(new Set(selectedTags))`
and `class:tag-chip--active={selectedTagSet.has(tag)}`.

⚠️ **Do not reintroduce `{const …}` inside an `{#each}` for this.** It is evaluated once and never
updates (`aria-pressed` stayed `false`; the only colour change was `:hover`). `{@const}` or a derived
`Set` are both fine.

## Frontend styling added in the last pass

Active tag chip and active category trigger share one treatment (matches the `color-mix` fill idiom
already used in `Members.svelte`):

```css
.tag-chip--active,
:global(.filter-select--active) {
	border-color: var(--foreground);
	background: color-mix(in oklch, var(--foreground) 8%, transparent);
	color: var(--foreground);
}
```

The trigger gets the class via `cn('filter-select', category !== null && 'filter-select--active')`.

## Verified in a browser (Chromium, dev server, dev deployment)

Cold load `?category=essay&tags=philosophy`:

- trigger active: `color oklch(0.12)`, `bg oklch(0.12 / 0.08)`, `border oklch(0.12)`
- 5 chips offered (essay's tags only, `pictures` correctly absent), 1 active, `aria-pressed="true"`
- 2 matching posts rendered, exact count in the chip

Backend, via `bunx convex run`:

```
posts/queries:listPublicPostsPaginated {"category":"essay"} → 4 posts, continueCursor "4", isDone true
posts/queries:listTags {"category":"essay"}                → audio, ideological concepts, music, persuasive media, philosophy
posts/queries:countPublicPosts {}                           → 11
```

Dev data for reference: **11 public posts**; `essay` 4, `pictures` 2; total public tags include
`pictures` and `music`, which `essay` does not have.

## Side effects already applied

- `bunx convex dev --once` **pushed the modified functions to the dev deployment**
  `careful-camel-515` (`baby-feavel/svelte-web3`, dev). Queries only — no schema change, no data
  migration, no production deployment touched.
- Re-push after any further backend edit: `bunx convex dev --once`. A stale dev deployment is why an
  early `convex run posts/queries:listTags '{"category":"essay"}'` failed with
  "Object contains extra field `category`".

## Open decision

The count chip (`countPublicPosts`) and the category-scoped chip list are both exposed to the
`convex-svelte` bug above. Nothing has been changed since it was found — the tree still contains that
code. Three options were presented; the reporter asked whether the second one really simplifies the
structure, and the answer given was "yes for coupling, marginally for line count":

**1. Revert the count.** Drop `countPublicPosts` (query + `countPublicPostsMatching`) and go back to
`total={posts.length}`. Smallest change; leaves the `listTags({ category })` exposure in place.

**2. One static-args query** (recommended). `listPublicPosts` returns all public post metadata; the
client derives the filtered list, the category-scoped tags, the category list and the exact count
from that one array, and paginates by slicing:

```ts
const feed = useQuery(api.posts.queries.listPublicPosts); // static args → one subscription
const all = $derived(feed.data ?? []);
const matching = $derived(filterPosts(all, filters));
const categories = $derived(distinctCategories(all));
const tagOptions = $derived(distinctTags(all, filters.category, filters.tags));
const total = $derived(matching.length);
let visible = $state(PAGE_SIZE); // sliced, not queried
const posts = $derived(matching.slice(0, visible));
```

- Removes 4 live subscriptions that can momentarily disagree, and the whole offset-cursor protocol
  (`listPublicPostsPaginated`, `countPublicPosts`, `countPublicPostsMatching`); `listDistinctTags`
  reverts to no-arg.
- **Does not** delete `listTags` / `listCategories`: `PostMetaPopover.svelte` and `routes/+page.svelte`
  still use them.
- Client script stays roughly the same size — the win is coupling, not lines.
- Pagination becomes `visible += MORE_SIZE`, and `setFilters` must reset `visible = PAGE_SIZE`
  (one explicit line, no effect).
- Cost: payload. Convex resends a query's whole result on each write, ~1 KB per public post: fine at
  11, ~0.5 MB/update at 500, bad at 5000. Today's ceiling is per-page read cost instead.
- Follow-up questions the reporter has not answered: (a) is client-only filtering acceptable (an
  SSR-filtered response or feed API would duplicate the logic)? (b) keep the "load more" button as a
  client slice, or render the whole match set?

**3. Leave it.** Accept that the count chip and tag chips can disappear when a filter change yields an
identical result.

## How to verify

Dev server (Playwright browsers on this machine are older than the installed playwright expects — pass
`executablePath` explicitly):

```bash
bun run dev --port 5199 &
```

```js
// /tmp/verify-feed.mjs — `node /tmp/verify-feed.mjs` with the package copy in the repo root
import { chromium } from 'playwright';
const EXE =
	process.env.HOME +
	'/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/' +
	'Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));

const count = async () =>
	(await page.locator('.filter-count').count())
		? await page.locator('.filter-count').innerText()
		: '(none)';
const url = () => page.evaluate(() => location.search);
const style = (loc) =>
	loc.evaluate((el) => {
		const s = getComputedStyle(el);
		return {
			cls: el.className,
			pressed: el.getAttribute('aria-pressed'),
			color: s.color,
			bg: s.backgroundColor,
			border: s.borderTopColor
		};
	});

await page.goto('http://localhost:5199/posts', { waitUntil: 'networkidle' });
await page.waitForSelector('.tag-chip');
console.log('initial slabs:', await page.locator('.slab-title').count());

// category → url, chips scoped, posts from beyond the first page appear
await page.locator('.filter-select').click();
await page.getByRole('option', { name: 'essay' }).click();
await page.waitForTimeout(1000);
console.log(
	'category:',
	await url(),
	'| slabs:',
	await page.locator('.slab-title').count(),
	'| chips:',
	await page.locator('.tag-chip').allInnerTexts(),
	'| trigger:',
	JSON.stringify(await style(page.locator('.filter-select'))),
	'| count:',
	await count()
);

// tag keeps category in the url, chip highlights
await page.locator('.tag-chip').first().click();
await page.mouse.move(0, 0);
await page.waitForTimeout(1000);
console.log(
	'tag:',
	await url(),
	'| chip:',
	JSON.stringify(await style(page.locator('.tag-chip--active').first()))
);

// deselect tag, then category → both params leave the url
await page.locator('.tag-chip--active').first().click();
await page.waitForTimeout(600);
console.log('tag off:', await url());
await page.locator('.filter-select').click();
await page.getByRole('option', { name: /All/ }).click();
await page.waitForTimeout(600);
console.log('all:', await url());

// shareable cold link
await page.goto('http://localhost:5199/posts?category=essay&tags=philosophy', {
	waitUntil: 'networkidle'
});
await page.waitForTimeout(1500);
console.log(
	'cold link:',
	await page.locator('.slab-title').allInnerTexts(),
	'| count:',
	await count()
);

await browser.close();
```

Regression cases worth keeping in any future redesign:

- `?tags=audio` → add a second tag whose match count is also 2 → **this is the `convex-svelte` bug**;
  the count chip must not vanish.
- Switch between two categories that share a tag set → chips must not vanish.
- `?tags=<tag that essay does not have>` — the tag must still render as an active, removable chip
  (that is why `tagOptions` is `tags ∪ selectedTags`).

## Next steps

- [ ] Decide option 1 / 2 / 3 above; nothing else is blocked on it.
- [ ] If any backend file changes: `bunx convex dev --once` to sync `careful-camel-515`.
- [ ] Commit. The tree is a single coherent change; suggested split: backend (filter-before-page +
      tags scoping) and frontend (URL/filter mechanism + styling).
- [ ] Optional, different file: `src/routes/posts/editor/+page.svelte` has the same `lastSearch` +
      `$effect` URL mirroring pattern (`:18–32`) for `?postId=`. It works today because there is
      exactly one writer, but it is the same hazard and could adopt `readFilters`/`writeFilters`.
- [ ] Optional: report the `convex-svelte` `useQuery` bug upstream — 0.15.1 is the current release,
      and the repro is six lines of Playwright above.
