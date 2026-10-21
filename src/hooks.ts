import { initConvex } from 'convex-svelte/sveltekit';
import { PUBLIC_CONVEX_URL } from '$app/env/public';
import type { Reroute } from '@sveltejs/kit/hooks';
import { deLocalizeUrl } from '#lib/paraglide/runtime.js';

// `hooks.ts` is universal (server + client), so this registers the Convex
// deployment URL before anything touches it. It must run here rather than in
// `hooks.client.ts`: SSR renders the root layout, which calls
// `createSvelteAuthClient()` → `getConvexUrl()`, and that throws unless the URL
// is already registered. Idempotent, so the client init is harmless on hydration.
initConvex(PUBLIC_CONVEX_URL);

export const reroute: Reroute = (request) => deLocalizeUrl(request.url).pathname;
