import {
	createConvexHttpClient,
	getAuthState
} from '@mmailaender/convex-better-auth-svelte/sveltekit';
import type { LayoutServerLoad } from './$types';
import { api } from '#convex/_generated/api.js';
import { AUTH_CONSTANTS } from '#convex/auth.constants.js';
import { building } from '$app/env';
import { PUBLIC_CONVEX_URL } from '$app/env/public';

export const load = (async ({ locals }) => {
	// During build/prerender, skip auth state fetching (BETTER_AUTH_SECRET not available)
	if (building) {
		return { authState: { isAuthenticated: false }, initialData: undefined };
	}

	const authState = getAuthState();
	const token = locals.token;
	if (!token) return { authState, initialData: undefined };
	// `url` is passed explicitly: `hooks.ts` registers the URL for the client
	// singleton, but each server request gets a fresh module graph, so the
	// implicit `getConvexUrl()` fallback is not reliable inside a load function.
	const client = createConvexHttpClient({ token, convexUrl: PUBLIC_CONVEX_URL });

	const orgs = AUTH_CONSTANTS.organizations;

	const [
		activeUser,
		accountList,
		activeOrganization,
		organizationList,
		invitationList,
		roleResult
	] = await Promise.all([
		client.query(api.users.queries.getActiveUser),
		client.query(api.users.queries.listAccounts),
		orgs
			? client.query(api.organizations.queries.getActiveOrganization)
			: Promise.resolve(undefined),

		orgs ? client.query(api.organizations.queries.listOrganizations) : Promise.resolve(undefined),

		orgs
			? client.query(api.organizations.invitations.queries.listInvitations)
			: Promise.resolve(undefined),
		orgs
			? client.query(api.organizations.queries.getOrganizationRole, {})
			: Promise.resolve(undefined)
	]);

	return {
		authState,
		initialData: {
			activeUser,
			accountList,
			activeOrganization,
			organizationList,
			invitationList,
			role: roleResult ?? undefined
		}
	};
}) satisfies LayoutServerLoad;
