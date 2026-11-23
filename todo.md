# add admin plugin

Done

## Admin (port from Convex-Better-Auth-UI) — DONE except admin bootstrap

- [x] Copy `lib/admin/**`, `convex/admin/**`, `routes/admin/+page.svelte`
- [x] Copy `convex/model/admin/{roles,index}.ts`
- [x] Copy `convex/betterAuth/{adminUsers,adminOrganizations}.ts`
- [x] Schema: admin fields (`user.role/banned/banReason/banExpires`, `session.impersonatedBy`) + search indexes
- [x] Port all admin UI from `#lib/primitives/ui/*` -> `#lib/ui/*` (our kit)
- [x] menu -> dropdown-menu, ark-ui -> bits-ui, design tokens remapped
- [x] `admin()` Better Auth plugin + impersonation guards + `adminClient()`
- [x] `AUTH_CONSTANTS.admin` flag
- [x] convex codegen, wrangler types, typecheck clean in src/
- [x] **Set `ADMIN_USER_IDS`** on dev deployment, then promote first admin
- [x] Browser-test the dashboard as a real admin

# test payments mechanism

# update packages

Done

## Wave 1: ~132 packages updated

- `bun run check` was failing on 5 errors. Cause: stale `.svelte-kit` build output, not source.
- Fixed `check` script: `rm -rf .svelte-kit && wrangler types && svelte-kit sync && svelte-check`. Order matters.
- `bun run check` now passes. 0 errors, 0 warnings.
- Updated tiptap 3.32.2 (22 pkgs), convex 1.49, convex-helpers 0.1.133, vite 8.3.5, svelte 5.57.3, kit 3.1.1, wrangler 4.156, bits-ui 2.20.2, lucide 1.65, paraglide 2.29.3, x402 2.29, and more.
- `@convex-dev/better-auth` 0.12.6, `@convex-dev/resend` 0.2.10.
- `runed` 0.38.0. `katex` 0.18.11 (0.18 is the max tiptap allows).
- Playwright's new version needed its browser binary. Ran `playwright install chromium`. `test:e2e` would have failed otherwise.
- Verified: build passes, all routes 200, browser zero console errors, katex renders, homepage unchanged.

## Blocked, do not bump

- `typescript` 7: breaks typescript-eslint.
- `better-auth` 1.7: 4 packages must move together, pinned at 1.6.16.
- `katex` 0.19: outside tiptap math peer range. 0.18.11 is the ceiling.
- `path-to-regexp` 9: `match()` API rewrite, risks Kit router.

## Payments — session 1 (2026-10-31)

### Found
- Test buyer: `paytest+1@feavel.com` / `DevTestPass123!` (id `k17a293dy69adbp2sfnbrpm6hs8hbxhp`), verified manually.
- API-level x402 handshake is correct: signed-in, unpaid GET `/api/resource/post/j57cn...` →
  `402` + `PAYMENT-REQUIRED` with `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1`, asset
  `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` (devnet USDC), `payTo` treasury, feePayer present.
- Not yet browser-tested: Phantom sign → verify → settle → PurchaseRecord → unlock.

### Done
- `PostSlab.svelte` paywall is now auth-aware:
  - signed out → "Sign in first…" hint + "Sign in to unlock" link (`redirectTo` back to the post)
  - signed in + no wallet → Connect prompt, Pay button disabled
  - signed in + wallet → shows short address, Pay enabled
  Why: PurchaseRecord is keyed by user, so paying before sign-in settles on-chain and then
  fails to write the record.

### Gotchas
- `bun run check` deletes `.svelte-kit` and kills a running `vite dev`. Restart dev after it, or the
  page throws "Failed to load /.svelte-kit/generated/dev/server.js".
- Auth tables live in the better-auth **component**, so `npx convex data user` shows nothing and
  `--inline-query ctx.db.query("user")` returns `[]`. Query via
  `runQuery(components.betterAuth.adapter.findMany, { model: 'user', where: [], paginationOpts })`.
- `requireEmailVerification: true`, so any new signup needs an inbox or a manual verify flip.

### Next
- [ ] Browser test the full pay flow with Phantom on a paywalled post
- [ ] Point `/services/[entryId]` at real posts — the paywall branch (`granted` / `locked` /
      unpublished) landed with the post-bodies split, but all 8 `postId`s in `lib/services/data.ts`
      are still `'replace-with-real-post-id'`
- [ ] Price label says "Price (SOL)" in `PostMetaPopover` but the ask is USD/USDC
- [ ] Paywall path has no failure messaging (no funds, user rejected, facilitator down)
- [ ] Settle-then-write ordering: if the Convex mutation throws, money moved but content stays locked

## x402 config → env (2026-10-31)

Two new vars, both `public:` (they ship in the client bundle anyway):

```
PUBLIC_X402_NETWORK=solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1   # devnet
PUBLIC_X402_TOKEN_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU  # devnet USDC
```

- Read by: `x402.ts` (client scheme), `api/resource/post/[postId]`, `api/premium`, `PostMetaPopover`.
- The post route now prices from env, NOT `ask.network`. Parked asks were pinning a stale
  testnet — the env flip proved it (network stayed devnet while the mint flipped).
- Verified by flipping to mainnet values: request 500'd with "Facilitator does not support
  exact on solana:5eykt…" → the free x402.org facilitator is devnet-only. **Prod needs a
  mainnet facilitator; `FACILITATOR_URL` must change with the network.**
- Also landed here: `settleResult.success` is now checked before writing a PurchaseRecord
  (both routes), and `console.log(paymentPayload)` removed from `/api/premium`.
- Price label was "Price (SOL)", now "Price (USDC)" — the ask was always USD.

### Gotcha
`PUBLIC_*` vars are importable from `$app/env/public`, not `$app/env/private`.
x402 types networks as `` `${string}:${string}` ``, so plain-string env needs a cast.
