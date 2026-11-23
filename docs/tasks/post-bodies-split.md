# Split post bodies out of `posts`

> **Executed.** All phases landed and the migration is complete: `posts.content` is gone, `postBodies`
> is the only body home. The owner commands below are historical — `backfillPostBodies` and
> `dropPostContent` have both run and have been deleted from `src/convex/migrations.ts`. Measured
> outcome: `docs/handoff-post-bodies.md`.

Implementation brief. Background and measurements: `docs/handoff-post-bodies.md`.

Move the Tiptap body to its own table so list queries stop paying for it, the paywall stops reading it,
and body saves stop re-running the feed. Fold the five authorization fixes below in at the same time.

## Target

```ts
// src/convex/schema.ts
postBodies: defineTable({
  postId: v.id('posts'),
  content: v.any(),
  updatedAt: v.number()
}).index('by_postId', ['postId'])
```

`posts.content` stays during the migration and is removed last (Phase 5).

## Running the lanes (one at a time, not in parallel)

Nothing here runs concurrently. Each `await` below finishes before the next starts, and all three lanes
edit the same checkout — two writers at once would collide in `src/convex/`. The order is
**A → gate → B → gate → C → gate**. Children start cold: make them read this file instead of pasting
briefs into the request.

- One line per child: `Read docs/tasks/post-bodies-split.md and execute the "<lane>" lane brief. Report as specified.`
- Gate scope follows its position: after A it checks backend rules only, after B it checks client rules
  only, after C it checks everything. The Gate brief lists which rule belongs to which gate.
- Bind each report to an artifact (`output: "reports/<lane>.md"`). Open it only when a gate fails.
- Main session reads `git diff --stat` and the gate verdict. Never read `src/convex/**`, the diff, or a
  full report to double-check a lane — that is the gate's job.
- Failed lane: `resume` that child with the gate's evidence. Do not restart it or re-brief.
- Stop and ask the owner if a gate fails twice on the same finding, codegen is unavailable, or a lane
  says this brief contradicts the code.

```js
// Workflow scripts are statement bodies: no arrow helpers, no nested functions. Sequential awaits.
const a = await runs.run('a', { agent: 'worker', output: 'reports/a.md',
  task: 'Read docs/tasks/post-bodies-split.md and execute the "A — backend" lane brief. Report as specified.' });
const g1 = await runs.run('gate-1', { agent: 'reviewer', output: 'reports/gate-1.md',
  task: 'Read docs/tasks/post-bodies-split.md and execute the "Gate" lane brief. Report as specified.' });
// stop if g1.output contains FAIL; otherwise
const b = await runs.run('b', { agent: 'worker', output: 'reports/b.md',
  task: 'Read docs/tasks/post-bodies-split.md and execute the "B — client" lane brief. Report as specified.' });
return [a.output, g1.output, b.output];
```

```
src/convex/model/posts/
  access.ts    getPostAccess(ctx, { postId }) -> { post, user, ask, canView, hasPaid }
  metadata.ts  existing metadata fns + updatePostMeta
  bodies.ts    getPostBody / upsertPostBody / deletePostBody
  index.ts     re-exports only
```

| Function | Returns | Gate |
|---|---|---|
| `queries.getPost` | `{ post, ask } \| null`, no `content` key | visibility |
| `queries.getPostContent` | `granted` + content, `locked` + ask, or `denied` | visibility + purchase |
| `queries.getPostForEdit` | `{ post, content } \| null` | author |
| `mutations.updatePost` | `content` becomes optional | author |
| `queries.listPublicPosts` | delete (unused) | — |

## Rules

1. Gate order in `getPostAccess`: fetch post → public? → author? → members + org membership? →
   otherwise denied. Only after a grant: `getAsk`, then `hasAccess`.
2. `getPostContent` checks purchase **before** reading the body row.
3. `getPostForEdit` returns metadata and body in one payload. `EdraEditor.svelte:30-40` builds the
   Tiptap instance once in `untrack()`; a late body means an empty editor, and Save writes it over the
   real body. `markDirty` does not protect you (`PostEditorSlab.svelte:31,52-54`).
4. Body-only saves must not patch the `posts` row (identical patch still re-runs feed subscribers).
   Skip no-op metadata patches; body edits bump `postBodies.updatedAt`, not `posts.updatedAt`.
5. `deletePost` removes body row + `asks` row in one transaction. `purchaseRecords` is a ledger —
   never delete from it.
6. `denied` and "not found" stay indistinguishable: `getPost` returns `null`.
7. Agents do not deploy, push, or run migrations. `npx convex codegen` is allowed. No worktrees, no
   concurrent writers — one checkout, one lane at a time. Subagents buy context isolation and a
   fresh-context reviewer, not speed.

## Phases

**1 — gate + authz fixes** (no behavior change otherwise)
- `access.ts` as above; `queries.ts:22-74` delegates. Keep `null` on denial and `ask: null` when paid.
- `listOrgPosts` (`model/posts/index.ts:112-122`) leaks other authors' private drafts to org members:
  filter `visibility !== 'private' || authorId === user._id`.
- `listDistinctTags` (`:26-39`): restrict to public posts.
- `payments.queries.getAsk` (`payments/queries.ts:8-21`) is unauthenticated: gate on post visibility.
- Delete dead `listPublicPosts` query + model fn.

**2 — schema**: add `postBodies`, keep `posts.content` optional.

**3a — backend**
- `bodies.ts` with `.unique()` on `by_postId`; temporary fallback `row?.content ?? post.content`.
- `updatePost`: optional `content`; write the body row only when provided; **keep patching
  `posts.content` too (dual write) until Phase 5a**; size guard
  (`JSON.stringify(content).length > 900_000` → `ConvexError`).
- New `getPostContent`, `getPostForEdit`.
- `deletePost`: body + ask.
- `rag.ts`: index text from the body row; `reindexPosts` → `internalAction`.

**3b/3c — client**
- `PostEditorSlab.svelte:20,154` → `getPostForEdit`; keep the `{#if postQuery.data}` mount gate and the
  dirty guard / unsaved dialog untouched.
- `PostSlab.svelte`: one `getPostContent` query; delete `paidContent` (`:74,89-90,183`) and body
  parsing; keep 402/204 toasts; paywall on `locked`, body on `granted`.
- `services/[entryId]/+page.svelte:15,59-68`: `getPostContent`; `locked` offers unlock, `denied` keeps
  the empty state.
- x402 route (`api/resource/post/[postId]/+server.ts`): payment gate only. 404 on `null`,
  `{ status: 'granted' }` when `!ask`, else existing 402/verify/settle/record flow returning the same.
  Delete the post-settlement body refetch. Headers unchanged.

**4 — backfill** (owner runs)
- `migrations.ts`: `{ internalMutation, schema }` in the constructor, then:

```ts
export const backfillPostBodies = migrations.define({
  table: 'posts',
  batchSize: 25, // 20 KB bodies x 100 = ~2 MB writes per transaction
  migrateOne: async (ctx, post) => {
    if (post.content == null) return;
    const existing = await ctx.db.query('postBodies')
      .withIndex('by_postId', (q) => q.eq('postId', post._id)).unique();
    if (existing) return;
    await ctx.db.insert('postBodies', { postId: post._id, content: post.content, updatedAt: post.updatedAt });
  }
});

export const dropPostContent = migrations.define({
  table: 'posts',
  migrateOne: async (ctx, post) => (post.content === undefined ? undefined : { content: undefined })
});
```

**5 — cutover, two deploys**: remove the fallback + dual write → run `dropPostContent` → remove
`content` from `posts` schema. The schema push rejects documents carrying an unknown field, so the
order is optional field → delete data → remove field.

**6 — measure**: rerun the §8 command in the handoff (expect ~92% smaller feed payload). Body-only save
must not re-run the feed query. Then update `docs/handoff-post-bodies.md` and `todo.md`.

## Lane briefs

Each lane brief is self-contained. Hand a child the one-line task from **Running the lanes**, not the text below.

### A — backend (`worker`)

> Repo `/Users/feavel/Documents/Playground/Svelte/202610/feavel-hub-sk3`. Read `docs/tasks/post-bodies-split.md`
> (all of it, it is short). Implement Phases 1, 2, 3a.
>
> Edit `src/convex/**` except `src/convex/migrations.ts`. Do not edit `src/lib/**`, `src/routes/**`,
> `docs/**`. Do not deploy.
>
> Phase 3a removes `content` from `getPost`, so the site stays broken until lane B lands. That is
> expected: do not patch client files to compensate, and do not deploy.
>
> Verify: `npx tsc --noEmit -p src/convex/tsconfig.json` clean; `npx convex codegen` run (report if it
> fails); `grep -rn "visibility ===" src/convex/posts src/convex/model/posts` only in `access.ts`.
> Errors in `src/lib`/`src/routes` are expected, not yours.
>
> Report ≤120 words: files changed, the three query return shapes, what you did with
> `payments.queries.getAsk`, codegen status, failures.

### B — client (`worker`)

> Lane A landed. Same repo and brief. Implement Phases 3b/3c. Edit `src/lib/posts/**`,
> `src/routes/services/[entryId]/+page.svelte`, `src/routes/api/resource/post/[postId]/+server.ts`.
> Do not edit `src/convex/**`.
>
> Verify: `bun run check` 0 errors; `grep -rn "paidContent\|post\.content" src/lib src/routes` no
> matches. If lane A removed `payments.queries.getAsk`, adapt `PostMetaPopover.svelte`.
>
> Report ≤100 words: files changed, x402 response shape, what the owner must click through.

### C — migrations (`worker`)

> Same repo and brief. Implement the two Phase 4 migrations **and the Phase 5a code cleanup**: delete
> the `posts.content` fallback in `src/convex/model/posts/bodies.ts` and stop writing `posts.content`
> in `updatePost`. Edit `src/convex/migrations.ts` and those two convex files only. Do not touch
> `src/convex/schema.ts` — removing the field is the owner's final step. Do not run anything.
>
> Verify: `npx tsc --noEmit -p src/convex/tsconfig.json` clean.
>
> Report ≤80 words: migration names, owner command sequence, the final schema edit still owed.

### Gate (`reviewer`, read-only)

> Read-only. Do not edit, create, delete, deploy, or run codegen. Refute, do not confirm. Brief:
> `docs/tasks/post-bodies-split.md`.
>
> **Gate-1 (after A):** Rules 1, 2, 6; gate order in `access.ts`; `getPost` returns no `content` and
> still `ask: null` when paid; `deletePost` cleans body + ask and leaves `purchaseRecords`; the five
> Phase 1 authz fixes.
> **Gate-2 (after B):** Rules 3, 4; editor uses `getPostForEdit` only and mounts after the body; no
> `paidContent`; x402 route is a payment gate with no body refetch; `bun run check` clean.
> **Gate-3 (after C):** everything above, plus `bun run check`, no `posts.content` fallback or dual
> write left, migrations present and typed, and the remaining owner step stated.
>
> Reject these known-false findings: x402 double-charge (covered by `ask: null`), backfill rows for null
> bodies, `.unique()` being unavailable.
>
> Report ≤150 words: pass/fail per Rule with file:line, then blocking findings only.

## Owner commands

```bash
# A and B are code-only. Lane A runs codegen so B can type; nothing is deployed yet.
npx convex dev --once                                            # after B: schema + functions incl. postBodies

npx convex run migrations:run '{"fn":"migrations:backfillPostBodies","dryRun":true}'
npx convex run migrations:run '{"fn":"migrations:backfillPostBodies"}'
# verify body rows == posts with non-null content, then:

npx convex dev --once                                            # after C: fallback + dual write gone, migrations live
npx convex run migrations:run '{"fn":"migrations:dropPostContent"}'
# edit schema.ts: delete `content` from posts, then
npx convex dev --once
```

`npx convex run` hits dev by default; pass `--prod` deliberately.

## Open decisions

1. `postBodies` (assumed) vs `postContents`.
2. Services page: `locked` shows unlock CTA or the generic empty state.
3. Fold `upsertAsk` into `updatePost` so the editor's "Saved" toast can't hide a failed price write?
   Recommended: no.
