# Post bodies are shipped to clients that never render them

Every post list query returns the full `posts` document, including `content` — the entire Tiptap JSON body. The feed and the editor's post picker render titles and dates; the body is fetched again by `getPost` when a post is actually opened. So the list copy is paid for and thrown away.

## Status: resolved

The body now lives in its own `postBodies` table and `posts.content` is gone. Re-measured on the
dev deployment after the split (10 public posts, `posts/queries:listPublicPostsPaginated`):

|                          | Before   | After       | Δ          |
| ------------------------ | -------- | ----------- | ---------- |
| Feed page payload        | 41,521 B | **3,508 B** | **−91.6%** |
| Largest single post      | 19,210 B | **504 B**   | **−97.4%** |
| Posts carrying `content` | 10       | **0**       | —          |

3,508 B is byte-identical to the "without `content`" projection below — the payload is now exactly
the lean shape. Because the body no longer lives in `posts`, the read cost drops too, which a
projection could not have achieved.

The paywall path no longer touches the body at all: `getPost` returns `{ post, ask }` in 575–735 B
for a paid post, and `getPostContent` answers a locked caller in a constant **235 B** regardless of
body size (previously the whole document was read from storage and then stripped). Bodies are
4.8–6.9 KB and cross the wire only on an explicit open, via `getPostContent`.

A body-only save no longer patches the `posts` row, so the feed query's read-set is unchanged and
open feeds are not re-pushed.

New shape: `src/convex/model/posts/{access,bodies,metadata}.ts`; `getPost` returns metadata plus ask,
`getPostContent` returns `granted`/`locked`/`denied`, `getPostForEdit` returns metadata and body in
one payload. `listPublicPosts` was deleted as unused.

## How it was measured (pre-split)

`listPublicPosts` no longer exists, so this exact command cannot be re-run. The equivalent against
today's code is `listPublicPostsPaginated` with `{"paginationOpts":{"numItems":100,"cursor":null}}`,
which returns a paginated envelope instead of a bare array.

```bash
curl -s -X POST "https://careful-camel-515.eu-west-1.convex.cloud/api/query" \
  -H 'Content-Type: application/json' \
  -d '{"path":"posts/queries:listPublicPosts","args":{},"format":"json"}' \
  -o /tmp/posts.json -w 'response: %{size_download} bytes\n'

node -e '
const posts = JSON.parse(require("fs").readFileSync("/tmp/posts.json","utf8")).value;
const full = JSON.stringify(posts).length;
const lean = JSON.stringify(posts.map(({ content, ...rest }) => rest)).length;
for (const p of posts) console.log(String(JSON.stringify(p).length).padStart(6), "B", p.title);
console.log({ posts: posts.length, full, withoutContent: lean, wastedPct: Math.round((full - lean) / full * 100) });'
```

Measured on the dev deployment (10 public posts): **41,521 bytes → 3,508 bytes without `content`, 92% waste.** The largest single post is 19,210 bytes, of which 504 bytes is metadata.

Then confirm nobody reads it: `grep -rn "\.content" src/routes src/lib/posts` — every hit resolves to `getPost`, not to a list result.

Origin: `src/convex/model/posts/index.ts` — `listOrgPosts`, `listMyPosts`, `listPublicPosts`, `listPublicPostsPaginated` all `.collect()` / `.paginate()` and return `Doc<'posts'>`.

## Why we want to solve it

1. **92% of the feed payload is unused** — wire bytes, client memory, JSON serialisation, 92% of it discarded on arrival.
2. **Paywalled posts cost the same as free ones.** `getPost` reads the whole document and _then_ strips it for unpaid viewers (`post: { ...post, content: null }`). The body is read from storage and thrown away.
3. **Every body edit churns every subscriber.** The feed query's read-set is `posts` documents, so saving a post re-runs that query for every open feed and re-pushes ~19 KB. Content changes shouldn't touch the feed at all.
4. **The body shares a row with metadata** that has nothing to do with it — including a per-document size limit that metadata updates inherit.

## One thing to understand before choosing a fix

Convex has no `SELECT`: `.collect()` materialises whole documents and that's what gets billed, so mapping to a smaller object _after_ the read only shrinks what crosses the wire — never the read. Only moving the body out of `posts` (into its own `postContents` document) reduces the read cost, and it also fixes 1–4 above. A projection is the 1-hour, zero-migration version that fixes 1 and 3 only.

https://stack.convex.dev/why-doesn-t-convex-have-select-or-count

Pick one deliberately; don't build both. If you touch Convex code, read `src/convex/_generated/ai/guidelines.md` first, and don't deploy from an agent.
