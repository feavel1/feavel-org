<script lang="ts">
	// Svelte
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	// Primitives
	import * as Popover from '../../ui/popover';
	import * as Dialog from '../../ui/dialog';
	import * as Avatar from '../../ui/avatar';
	import { Button } from '../../ui/button';
	// Icons
	import Building2Icon from '@lucide/svelte/icons/building-2';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	// Components
	import CreateOrganization from './CreateOrganization.svelte';

	import LeaveOrganization from './LeaveOrganization.svelte';

	// API
	import { useQuery, useConvexClient } from 'convex-svelte';
	import { useAuth } from '@mmailaender/convex-better-auth-svelte/svelte';
	import { useRoles } from '../api/roles.svelte';
	import { getAuthContext } from '../../auth/context.svelte';
	const { api, authConstants } = getAuthContext();
	const client = useConvexClient();

	// Constants
	import { DIALOG_KEY } from '../utils/organization.constants';

	// Types
	import type { Path } from '$app/types';
	import type {
		GetActiveOrganizationType,
		ListOrganizationsType,
		GetActiveUserType,
		ListInvitationsType,
		Role
	} from '../../auth/types';

	// Props
	const {
		popoverPlacement = 'bottom-end',
		initialData

		/** Placement of the popover relative to the trigger */
	}: {
		popoverPlacement?:
			'top' | 'bottom' | 'left' | 'right' | 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end';
		initialData?: {
			activeUser?: GetActiveUserType;
			organizationList?: ListOrganizationsType;
			activeOrganization?: GetActiveOrganizationType;
			invitationList?: ListInvitationsType;
			role?: Role;
		};
	} = $props();

	if (!authConstants.organizations) {
		console.error(
			'Organizations are disabled, but OrganizationSwitcher is being used. Please turn them on in auth.constants.ts'
		);
	}

	// Auth
	const auth = useAuth();
	const isLoading = $derived(auth.isLoading);
	const isAuthenticated = $derived(auth.isAuthenticated);

	// Queries - backend handles authentication, initialData prevents empty state during auth sync
	const organizationListResponse = useQuery(
		api.organizations.queries.listOrganizations,
		() => (auth.isAuthenticated ? {} : 'skip'),
		() => ({ initialData: initialData?.organizationList })
	);

	const activeOrganizationResponse = useQuery(
		api.organizations.queries.getActiveOrganization,
		() => (auth.isAuthenticated ? {} : 'skip'),
		() => ({ initialData: initialData?.activeOrganization })
	);
	const organizationList = $derived(organizationListResponse?.data);
	const activeOrganization = $derived(activeOrganizationResponse?.data);
	const roles = useRoles({}, () => ({
		initialData: initialData?.role
	}));
	const isOwnerOrAdmin = $derived(roles.hasOwnerOrAdminRole);

	// Component state
	let switcherPopoverOpen: boolean = $state(false);
	let createOrganizationDialogOpen: boolean = $state(false);

	/** Up to two capitals from the org name, for the logo stand-in. */
	function initials(name?: string): string {
		if (!name) return '—';
		const words = name.trim().split(/\s+/).filter(Boolean);
		if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
		return (words[0][0] + words[1][0]).toUpperCase();
	}

	// bits-ui v2 splits the old `positioning` object into `side` + `align` on the
	// Content component, e.g. 'bottom-end' => { side: 'bottom', align: 'end' }.
	const popoverPositioning = $derived.by(() => {
		const [side, align] = popoverPlacement.split('-') as [
			'top' | 'bottom' | 'left' | 'right',
			'start' | 'end' | undefined
		];
		return { side, align: align ?? 'center' } as const;
	});

	// iOS back-swipe handling
	let isIOS: boolean = $state(false);

	// Back-swipe guard
	let guardTimer: ReturnType<typeof setTimeout> | null = null;
	let prevShouldBeOpen = false;

	// Handler functions

	function closeCreateOrganization(): void {
		createOrganizationDialogOpen = false;
	}
	function openCreateOrgModal(): void {
		createOrganizationDialogOpen = true;
		switcherPopoverOpen = false;
	}

	// 3: Open via button — push history entry + open immediately for snappy UX
	function openProfileModal() {
		switcherPopoverOpen = false;
		const url = new URL(page.url.href);
		if (url.searchParams.get('dialog') !== DIALOG_KEY) {
			url.searchParams.set('dialog', DIALOG_KEY);
			void goto(resolve(`${url.pathname}${url.search}${url.hash}` as Path), {
				replaceState: false,
				reset: false
			});
		}
	}

	// iOS Safari back-swipe guard only: do not mutate state here, only arm guard
	onMount(() => {
		// Detect iOS/iPadOS (including iPadOS 13+ which reports as Macintosh)
		const ua = navigator.userAgent;

		isIOS =
			/iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);

		const initialSlug = activeOrganization?.slug;
		if (initialSlug) {
			const pathname = page.url.pathname;

			if (/(?:^|\/)\b(active-organization|active-org)\b(?=\/|$)/.test(pathname)) {
				const newPathname = pathname.replace(
					/\/(active-organization|active-org)(?=\/|$)/g,
					`/${initialSlug}`
				);

				void goto(resolve(`${newPathname}${page.url.search}${page.url.hash}` as Path), {
					replaceState: true,
					reset: false
				});
			}
		}

		const onPopState = () => {
			if (!isIOS) return;
			// Only arm guard when the dialog is actually closing via history (not when switching tabs)
			const url = new URL(window.location.href);
			const shouldBeOpen = url.searchParams.get('dialog') === DIALOG_KEY;
			const closingCandidate = prevShouldBeOpen && !shouldBeOpen;
			if (closingCandidate) {
				if (guardTimer) clearTimeout(guardTimer);
				guardTimer = setTimeout(() => {
					guardTimer = null;
				}, 650);
			}
		};
		window.addEventListener('popstate', onPopState);
		return () => window.removeEventListener('popstate', onPopState);
	});

	$effect(() => {
		const slug = activeOrganization?.slug;
		const { pathname, search, hash } = page.url;

		if (slug && /(?:^|\/)(active-organization|active-org)(?=\/|$)/.test(pathname)) {
			const newPathname = pathname.replace(
				/\/(active-organization|active-org)(?=\/|$)/g,
				`/${slug}`
			);

			void goto(resolve(`${newPathname}${search}${hash}` as Path), {
				replaceState: true,
				reset: false
			});
		}
	});

	/**
	 * Updates the active organization and replaces URL slug if needed
	 */
	async function updateActiveOrg(organizationId?: string): Promise<void> {
		try {
			// Get current active organization slug before mutation
			const currentActiveOrgSlug = activeOrganization?.slug;
			const currentPathname = page.url.pathname;

			// Check if current URL contains the active organization slug
			const urlContainsCurrentSlug =
				currentActiveOrgSlug &&
				(currentPathname.includes(`/${currentActiveOrgSlug}/`) ||
					currentPathname.includes(`/${currentActiveOrgSlug}`));

			// Execute the mutation to set new active organization
			await client.mutation(api.organizations.mutations.setActiveOrganization, { organizationId });

			// Get the new active organization data
			const newActiveOrgSlug = activeOrganization?.slug;

			// If URL contained old slug and we have a new slug, replace it
			if (
				urlContainsCurrentSlug &&
				currentActiveOrgSlug &&
				newActiveOrgSlug &&
				currentActiveOrgSlug !== newActiveOrgSlug
			) {
				// Replace the old slug with the new slug in the URL
				const newPathname = currentPathname.replace(
					new RegExp(`/${currentActiveOrgSlug}(?=/|$)`, 'g'),
					`/${newActiveOrgSlug}`
				);

				// Navigate to the new URL
				await goto(resolve(newPathname as Path), { replaceState: true });
			} else {
				// No slug replacement needed, just refresh current page
				await goto(resolve((page.url.pathname + page.url.search) as Path), { replaceState: true });
			}

			// Close popover
			switcherPopoverOpen = false;
		} catch (err) {
			console.error('Error updating active organization:', err);
		}
	}

	// Check on mount if there is an active organization and if not, use the first organization from listOrganizations and call setActiveOrg (We use effect instead of useMount as organizations and activeOrganization are loaded async)
	$effect(() => {
		if (organizationList && organizationList.length > 0 && !activeOrganization) {
			updateActiveOrg();
		}
	});
</script>

{#if !authConstants.organizations}
	<!-- Gate 1: Organizations feature is disabled -->
	<div class="text-destructive">
		Organizations are disabled, but OrganizationSwitcher is being used. Please turn them on in
		auth.constants.ts
	</div>
{:else if !isAuthenticated}
	<!-- Gate 2: Not authenticated - don't show anything -->
	<!-- Return null by not rendering anything -->
{:else if (isLoading || (organizationListResponse?.isLoading ?? false) || (activeOrganizationResponse?.isLoading ?? false)) && !organizationList && !activeOrganization}
	<!-- Gate 3: Loading state - only show if queries are loading AND no data is available yet -->
	<div class="h-8 w-40 animate-pulse rounded-md bg-muted"></div>
{:else if organizationList && organizationList.length === 0}
	<!-- Gate 4: No organizations - show create organization modal -->
	<Dialog.Root bind:open={createOrganizationDialogOpen}>
		<Dialog.Trigger>
			{#snippet child({ props })}
				<button {...props} class="org-empty-trigger">
					<PlusIcon class="size-3" />
					<span>New organization</span>
				</button>
			{/snippet}
		</Dialog.Trigger>
		<Dialog.Content class="max-w-md">
			<CreateOrganization onSuccessfulCreate={closeCreateOrganization} />
		</Dialog.Content>
	</Dialog.Root>
{:else if organizationList}
	<!-- Gate 5: Has organizations - show the switcher -->
	<Popover.Root bind:open={switcherPopoverOpen}>
		<Popover.Trigger>
			{#snippet child({ props })}
				<!-- Matches the nav's quiet typographic register: no border, no card,
				     no shadow. A hairline rule and micro-caps label carry the weight. -->
				<button
					{...props}
					class="org-trigger"
					aria-label="Switch organization: {activeOrganization?.name ?? 'none'}"
				>
					<span class="org-mark" aria-hidden="true">
						{#if activeOrganization?.logo}
							<img src={activeOrganization.logo} alt="" />
						{:else}
							{initials(activeOrganization?.name)}
						{/if}
					</span>
					<span class="org-trigger-name">{activeOrganization?.name}</span>
					<ChevronsUpDownIcon class="org-trigger-caret" />
				</button>
			{/snippet}
		</Popover.Trigger>
		<Popover.Content {...popoverPositioning} class="org-panel">
			<div class="org-panel-inner">
				<p class="org-panel-label">Organization</p>

				<!-- Active org: identity first, then the action verbs beside it. -->
				<div class="org-current">
					<span class="org-mark org-mark--lg" aria-hidden="true">
						{#if activeOrganization?.logo}
							<img src={activeOrganization.logo} alt="" />
						{:else}
							{initials(activeOrganization?.name)}
						{/if}
					</span>
					<div class="org-current-body">
						<span class="org-current-name">{activeOrganization?.name}</span>
						<span class="org-current-slug">{activeOrganization?.slug}</span>
					</div>
					{#if isOwnerOrAdmin}
						<button class="org-action" onclick={openProfileModal} title="Organization settings">
							<SettingsIcon />
							<span class="sr-only">Organization settings</span>
						</button>
					{:else}
						<LeaveOrganization />
					{/if}
				</div>

				{#if organizationList.filter((org) => org && org.id !== activeOrganization?.id).length > 0}
					<p class="org-panel-label org-panel-label--sep">Switch to</p>
					<ul class="org-list">
						{#each organizationList.filter((org) => org && org.id !== activeOrganization?.id) as org (org?.id)}
							<li>
								<button class="org-row" onclick={() => updateActiveOrg(org.id)}>
									<span class="org-mark">
										{#if org.logo}
											<img src={org.logo} alt="" />
										{:else}
											{initials(org.name)}
										{/if}
									</span>
									<span class="org-row-name">{org.name}</span>
									<span class="org-row-go" aria-hidden="true">→</span>
								</button>
							</li>
						{/each}
					</ul>
				{/if}

				<button class="org-create" onclick={openCreateOrgModal}>
					<span class="org-mark org-mark--ghost" aria-hidden="true"><PlusIcon /></span>
					<span class="org-create-label">New organization</span>
				</button>
			</div>
		</Popover.Content>
	</Popover.Root>

	<!-- Create Organization Modal -->
	<Dialog.Root bind:open={createOrganizationDialogOpen}>
		<Dialog.Content class="max-w-md">
			<Dialog.Header>
				<Dialog.Title>Create Organization</Dialog.Title>
			</Dialog.Header>
			<CreateOrganization onSuccessfulCreate={closeCreateOrganization} />
		</Dialog.Content>
	</Dialog.Root>
{/if}

<style>
	/* ── Trigger ───────────────────────────────────────────────────────────────
	   The nav is quiet typography; this control has to disappear into it rather
	   than sit in it as a bordered widget. No border, no card, no shadow — a
	   hairline rule under the name does the separating work instead. */
	.org-trigger {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		max-width: 11rem;
		padding: 0;
		border: 0;
		background: none;
		cursor: pointer;
		color: color-mix(in oklch, var(--foreground) 18%, var(--muted-foreground));
		font-family: inherit;
		line-height: 1;
		transition: color 0.2s ease;
	}
	.org-trigger:hover {
		color: var(--foreground);
	}
	/* `aria-expanded` is injected by the Popover primitive, so Svelte cannot
	   statically see it on this element. */
	.org-trigger:global([aria-expanded='true']) {
		color: var(--foreground);
	}
	.org-trigger:focus-visible {
		outline: 1px solid var(--ring);
		outline-offset: 4px;
	}

	.org-trigger-name {
		font-size: 0.6875rem;
		font-weight: 400;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
		/* Hairline underline keyed to the text, not a box around it. */
		border-bottom: 1px solid color-mix(in oklch, currentColor 30%, transparent);
		padding-bottom: 0.1875rem;
	}

	.org-trigger-caret {
		width: 0.75rem;
		height: 0.75rem;
		flex-shrink: 0;
		opacity: 0.45;
		transition: opacity 0.2s ease;
	}
	.org-trigger:hover :global(.org-trigger-caret),
	.org-trigger:global([aria-expanded='true']) :global(.org-trigger-caret) {
		opacity: 0.8;
	}

	/* Square mark, never a rounded avatar chip. */
	.org-mark {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 1.375rem;
		height: 1.375rem;
		border: 1px solid color-mix(in oklch, var(--foreground) 18%, transparent);
		color: var(--foreground);
		font-family: var(--font-heading);
		font-size: 0.5625rem;
		letter-spacing: 0.02em;
		line-height: 1;
		overflow: hidden;
	}
	.org-mark :global(img) {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.org-mark--lg {
		width: 2.25rem;
		height: 2.25rem;
		font-size: 0.75rem;
	}
	.org-mark--ghost {
		border-style: dashed;
		color: color-mix(in oklch, var(--foreground) 18%, var(--muted-foreground));
	}
	.org-mark--ghost :global(svg) {
		width: 0.6875rem;
		height: 0.6875rem;
	}

	/* ── Panel ─────────────────────────────────────────────────────────────────
	   Editorial sheet: flat, hairline-bordered, zero radius, no blur or glass. */
	:global(.org-panel) {
		padding: 0;
		width: 17rem;
		border: 1px solid var(--border);
		border-radius: 0;
		background: var(--popover);
		box-shadow: 0 12px 32px -12px color-mix(in oklch, var(--foreground) 22%, transparent);
	}
	.org-panel-inner {
		display: flex;
		flex-direction: column;
		padding: 0.875rem 0 0;
	}

	.org-panel-label {
		margin: 0 0 0.5rem;
		padding: 0 0.875rem;
		font-size: 0.5625rem;
		font-weight: 400;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: color-mix(in oklch, var(--foreground) 18%, var(--muted-foreground));
	}
	.org-panel-label--sep {
		margin-top: 0.875rem;
		padding-top: 0.875rem;
		border-top: 1px solid color-mix(in oklch, var(--border) 60%, transparent);
	}

	/* Active org — identity block, no container. */
	.org-current {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0 0.875rem 0.875rem;
	}
	.org-current-body {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
		flex: 1;
	}
	.org-current-name {
		font-family: var(--font-heading);
		font-size: 1rem;
		line-height: 1.15;
		color: var(--foreground);
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.org-current-slug {
		font-size: 0.5625rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: color-mix(in oklch, var(--foreground) 18%, var(--muted-foreground));
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.org-action {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		flex-shrink: 0;
		border: 0;
		background: none;
		color: color-mix(in oklch, var(--foreground) 18%, var(--muted-foreground));
		cursor: pointer;
		transition:
			color 0.2s ease,
			background-color 0.2s ease;
	}
	.org-action:hover {
		color: var(--foreground);
		background: color-mix(in oklch, var(--foreground) 6%, transparent);
	}
	.org-action:focus-visible {
		outline: 1px solid var(--ring);
		outline-offset: -1px;
	}
	.org-action :global(svg) {
		width: 0.875rem;
		height: 0.875rem;
	}

	/* Switch list — rows separated by hairlines, no per-row containers. */
	.org-list {
		display: flex;
		flex-direction: column;
	}

	.org-row {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		width: 100%;
		padding: 0.5rem 0.875rem;
		border: 0;
		border-top: 1px solid color-mix(in oklch, var(--border) 45%, transparent);
		background: none;
		cursor: pointer;
		text-align: left;
		font-family: inherit;
		color: color-mix(in oklch, var(--foreground) 18%, var(--muted-foreground));
		transition:
			background-color 0.18s ease,
			color 0.18s ease;
	}
	.org-row:first-child {
		border-top: 0;
	}
	.org-row:hover {
		background: color-mix(in oklch, var(--foreground) 5%, transparent);
		color: var(--foreground);
	}
	.org-row:focus-visible {
		outline: 1px solid var(--ring);
		outline-offset: -1px;
	}

	.org-row-name {
		flex: 1;
		min-width: 0;
		font-size: 0.8125rem;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.org-row-go {
		flex-shrink: 0;
		font-size: 0.75rem;
		opacity: 0;
		transform: translateX(-0.25rem);
		transition:
			opacity 0.18s ease,
			transform 0.18s ease;
	}
	.org-row:hover .org-row-go,
	.org-row:focus-visible .org-row-go {
		opacity: 0.7;
		transform: translateX(0);
	}

	/* Create — the one intentionally recessed affordance. */
	.org-create {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		width: 100%;
		margin-top: 0.5rem;
		padding: 0.625rem 0.875rem;
		border: 0;
		border-top: 1px solid color-mix(in oklch, var(--border) 60%, transparent);
		background: none;
		cursor: pointer;
		text-align: left;
		font-family: inherit;
		color: color-mix(in oklch, var(--foreground) 18%, var(--muted-foreground));
		transition:
			background-color 0.18s ease,
			color 0.18s ease;
	}
	.org-create:hover {
		background: color-mix(in oklch, var(--foreground) 5%, transparent);
		color: var(--foreground);
	}
	.org-create:focus-visible {
		outline: 1px solid var(--ring);
		outline-offset: -1px;
	}
	.org-create-label {
		font-size: 0.6875rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	/* No-org state: same restraint as the trigger. */
	.org-empty-trigger {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0;
		border: 0;
		background: none;
		cursor: pointer;
		font-family: inherit;
		font-size: 0.6875rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: color-mix(in oklch, var(--foreground) 18%, var(--muted-foreground));
		transition: color 0.2s ease;
	}
	.org-empty-trigger:hover {
		color: var(--foreground);
	}

	@media (prefers-reduced-motion: reduce) {
		.org-trigger,
		.org-trigger-caret,
		.org-row,
		.org-row-go,
		.org-create,
		.org-action,
		.org-empty-trigger {
			transition: none;
		}
		.org-row-go {
			transform: none;
		}
	}
</style>
