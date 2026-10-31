# feavel-hub

A personal hub: blog, portfolio, games and audio player in one app — with real accounts, organizations and an admin dashboard.

**Stack:** SvelteKit (Svelte 5 runes) · Convex · Better Auth · Tailwind v4 · Cloudflare Workers

## Features

- **Accounts** — sign up / sign in with email + password. Sessions, password reset, email verification, API keys.
- **Organizations** — users belong to organizations, invite members, switch active org.
- **Admin dashboard** — `/admin`. List and search users and organizations, edit profiles, change roles, ban, delete, set passwords, sign out everywhere, impersonate users. Server-enforced: every admin action re-checks permissions on the backend.
- **Blog** — write posts in a rich text editor (TipTap) with markdown, code blocks, math, tables and images. Filter and browse posts.
- **Portfolio / services** — project showcase and a contact form that stores inquiries.
- **Games** — chess and tic-tac-toe.
- **Audio player** — play local audio with a waveform visualizer.
- **Wallets** — Solana wallet connection and x402 payments.
- **i18n** — English, Chinese, Russian via Paraglide.

## Getting started

```bash
bun install
bun x convex dev      # backend + type generation
bun run dev           # http://localhost:5173
```

Check types:

```bash
bun x wrangler types && bun run check
```

## Becoming an admin

Set your Better Auth user id on the deployment, then open `/admin`:

```bash
bun x convex env set ADMIN_USER_IDS "<your-user-id>"
```

Once one admin exists, promote others from the dashboard.

## Layout

```
src/
  routes/       pages (admin, posts, services, games, (auth))
  lib/          UI components, feature modules, i18n
  convex/       backend: schema, queries, mutations, auth
```
