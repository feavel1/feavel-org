<script lang="ts">
	// SvelteKit
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';

	// Icons
	import ShieldAlertIcon from '@lucide/svelte/icons/shield-alert';

	// Components
	import { Button } from '#lib/ui/button/index.js';
	import AdminDashboard from '#lib/admin/ui/AdminDashboard.svelte';

	// API
	import { useQuery } from 'convex-svelte';
	import { useAuth } from '@mmailaender/convex-better-auth-svelte/svelte';
	import { getAuthContext } from '#lib/auth/context.svelte.js';

	// Constants
	import { ADMIN_ROUTE } from '#lib/admin/utils/admin.constants.js';

	const { api } = getAuthContext();
	const auth = useAuth();

	// `undefined` while loading, `true`/`false` once resolved.
	const adminResponse = useQuery(api.admin.queries.isCurrentUserAdmin, () =>
		auth.isAuthenticated ? {} : 'skip'
	);
	const isAdmin = $derived(adminResponse?.data);

	// Gating is UX only — the real boundary is `requireAppAdmin` on every admin
	// Convex function. Signed-out visitors go to sign-in and return to /admin.
	$effect(() => {
		if (!auth.isLoading && !auth.isAuthenticated) {
			const signInUrl = `${resolve('/(auth)/signin')}?redirectTo=${encodeURIComponent(resolve(ADMIN_ROUTE))}`;
			// eslint-disable-next-line svelte/no-navigation-without-resolve -- the path is resolved, the query string is appended to carry the redirect back to /admin
			void goto(signInUrl, { replace: true });
		}
	});
</script>

<svelte:head>
	<title>Admin</title>
</svelte:head>

{#if adminResponse.error}
	<div class="mx-auto max-w-md p-6 text-center text-sm text-destructive">
		{adminResponse.error.message}
	</div>
{:else if auth.isLoading || !auth.isAuthenticated || isAdmin === undefined}
	<!-- Resolving auth or the admin check → a neutral spinner (no content flash). -->
	<div class="flex min-h-[60vh] w-full items-center justify-center p-6">
		<div
			class="size-6 animate-spin rounded-full border-2 border-border border-t-transparent"
			role="status"
			aria-label="Loading"
		></div>
	</div>
{:else if isAdmin === false}
	<!--
		Signed in, but not an application admin.

		Default: a transparent 403 "Access denied" page — the conventional behavior
		for admin tooling, and harmless because every admin Convex function enforces
		access server-side regardless of what this page shows.

		To HIDE that an admin area exists instead (e.g. a public-facing app where
		regular users shouldn't know it's there), replace this block with a 404:
		in a +page.ts/+page.server.ts `load`, `throw error(404, 'Not found')`.
	-->
	<div
		class="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center gap-4 p-6 text-center"
	>
		<ShieldAlertIcon class="size-10 opacity-60" aria-hidden="true" />
		<div>
			<h1 class="font-heading text-xl">Access denied</h1>
			<p class="mt-1 text-sm text-muted-foreground">You don't have permission to view this page.</p>
		</div>
		<Button variant="secondary" href={resolve('/')}>Back to home</Button>
	</div>
{:else}
	<div class="mx-auto w-full max-w-5xl p-4 sm:p-6">
		<h1 class="mb-4 font-heading text-2xl">Admin</h1>
		<AdminDashboard />
	</div>
{/if}
