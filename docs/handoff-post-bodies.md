# Post bodies are shipped to clients that never render them

Every post list query returns the full `posts` document, including `content` — the entire Tiptap JSON body. The feed and the editor's post picker render titles and dates; the body is fetched again by `getPost` when a post is actually opened. So the list copy is paid for and thrown away.

## How to see it

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
