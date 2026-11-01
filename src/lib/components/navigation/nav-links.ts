// Single source of truth for the primary nav. Both the desktop links in
// +layout.svelte and the mobile drawer render from this list, so a route or a
// translation can never drift between the two.
import { resolve } from '$app/paths';
import { m } from '#lib/paraglide/messages.js';

/** A route already passed through `resolve()`; opaque to the eslint plugin. */
export type ResolvedHref = ReturnType<typeof resolve>;

export type NavLink = {
	href: ResolvedHref;
	/** Message function — called at render time so locale switches apply. */
	label: () => string;
};

export const navLinks: NavLink[] = [
	{ href: resolve('/posts'), label: () => m.jolly_gazelle_surge() },
	{ href: resolve('/services'), label: () => m.blank_quail_drift() },
	{ href: resolve('/games'), label: () => m.thin_koala_dock() }
];
