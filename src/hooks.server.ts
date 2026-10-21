import { getTextDirection } from '#lib/paraglide/runtime.js';
import { paraglideMiddleware } from '#lib/paraglide/server.js';
import { sequence, type Handle } from '@sveltejs/kit/hooks';
import { building } from '$app/env';
import { redirect } from '@sveltejs/kit';
import { getSessionCookie } from 'better-auth/cookies';
import { createRouteMatcher } from '#lib/utils/routeMatcher.js';
import { getToken } from '@mmailaender/convex-better-auth-svelte/sveltekit';
import { withServerConvexToken } from 'convex-svelte/sveltekit/server';

const paraglideHandle: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ locale }) => {
		// SvelteKit 3's `RequestEvent.request` is read-only, so the middleware's
		// de-localized request (e.g. `/fr/about` -> `/about`) can't be assigned back.
		// `reroute` in hooks.ts already de-localizes the URL for route matching, so
		// `event.request` / `event.url` stay authoritative when the `url` strategy is
		// in use — see https://paraglidejs.com/middleware ("frameworks that handle URL
		// localization themselves"). Locale state is still set by the middleware.
		return resolve(event, {
			transformPageChunk: ({ html }) => {
				return html.replace('%lang%', locale).replace('%dir%', getTextDirection(locale));
			}
		});
	});
/* --------------------------------------------------------- */
/* -------------------- route match helpers ---------------- */
/* --------------------------------------------------------- */
const isLogin = createRouteMatcher(['/signin']);

const isPublic = createRouteMatcher([
	'/',
	'/signin',
	'/create',
	'/tic-tac-toe',
	'/reset-password',
	'/api/auth{/*rest}',
	'/api{/*rest}',
	'/pricing',
	'/docs{/*rest}',
	'/about',
	'/terms',
	'/privacy',
	'/posts{/*rest}',
	'/demo{/*rest}'
]);

/* --------------------------------------------------------- */
/* ---------------------- auth helpers --------------------- */
/* --------------------------------------------------------- */
/** Builds `/path?redirectTo=/original/path%3Fquery`  */
const withRedirect = (to: string, event: Parameters<Handle>[0]['event']) =>
	`${to}?redirectTo=${encodeURIComponent(event.url.pathname + event.url.search)}`;

/* --------------------------------------------------------- */
/* ---------------------- main handler --------------------- */
/* --------------------------------------------------------- */
const requireAuth: Handle = async ({ event, resolve }) => {
	// ⛑️ During build/prerender, skip all auth logic.
	// This prevents "Cannot access url.search on a page with prerendering enabled".
	if (building) {
		return resolve(event);
	}

	const { pathname } = event.url;
	const sessionCookie = getSessionCookie(event.request);

	/* ---------- 1. Handle public routes first ---------- */
	if (isPublic(pathname)) {
		// Special case: redirect authenticated users away from signin
		if (isLogin(pathname) && sessionCookie) {
			throw redirect(307, '/');
		}
		return resolve(event);
	}

	/* ---------- 2. All other routes require authentication ---------- */
	if (!sessionCookie) {
		throw redirect(307, withRedirect('/signin', event));
	}

	return resolve(event);
};

export const setTokenFromCookies: Handle = async ({ event, resolve }) => {
	// ⛑️ During build/prerender, skip all auth logic.
	// This prevents "BetterAuthError on a page with prerendering enabled".
	if (building) {
		return resolve(event);
	}

	const token = getToken(event.cookies);
	event.locals.token = token;

	return withServerConvexToken(token, () => resolve(event));
};

/* --------------------------------------------------------- */
/* ---------------------- exported hook -------------------- */
/* --------------------------------------------------------- */
export const handle = sequence(paraglideHandle, /* 1 */ requireAuth, /* 2 */ setTokenFromCookies);
