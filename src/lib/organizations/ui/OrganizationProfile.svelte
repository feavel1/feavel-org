<script lang="ts">
	// Svelte
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	/** UI **/
	// Primitives
	import * as Tabs from '../../ui/tabs';
	import { Button } from '../../ui/button';
	// Icons
	import BoltIcon from '@lucide/svelte/icons/bolt';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import UserIcon from '@lucide/svelte/icons/user';
	// import WalletIcon from '@lucide/svelte/icons/wallet';
	import XIcon from '@lucide/svelte/icons/x';
	// Widgets
	import GeneralSettings from './GeneralSettings.svelte';
	import DeleteOrganization from './DeleteOrganization.svelte';
	import MembersAndInvitations from './MembersAndInvitations.svelte';
	import LeaveOrganization from './LeaveOrganization.svelte';
	// Utils
	import { useMobileState } from '../../utils/mobileState.svelte';
	const mobileState = useMobileState();

	// API
	import { useRoles } from '../api/roles.svelte';

	// Types
	import type { Path } from '$app/types';
	import type {
		GetActiveOrganizationType,
		GetActiveUserType,
		ListInvitationsType,
		Role
	} from '../../auth/types';

	// Types
	type OrganizationProfileProps = {
		/**
		 * Whether the dialog is open. Used to reset internal state on close.
		 */
		open?: boolean;
		/**
		 * Optional callback that will be called when an organization is successfully deleted
		 */
		onSuccessfulDelete?: (() => void) | undefined;
		/**
		 * Optional initial data to pass to child components for faster initialization
		 */
		initialData?: {
			// For GeneralSettings & LeaveOrganization component
			activeUser?: GetActiveUserType;
			activeOrganization?: GetActiveOrganizationType;
			// For MembersAndInvitations component
			invitationList?: ListInvitationsType;
			role?: Role;
		};
	};

	const { open = false, onSuccessfulDelete, initialData }: OrganizationProfileProps = $props();

	const roles = useRoles({}, () => ({
		initialData: initialData?.role
	}));
	const isOwnerOrAdmin = $derived(roles.hasOwnerOrAdminRole);

	// State
	let activeMobileTab: string = $state('');
	let activeDesktopTab: string = $state('general');
	// Guard to only initialize desktop tab from URL on open
	let initializedDesktopFromUrl: boolean = $state(false);
	// Suppress mobile transitions when coming from browser back/forward (iOS swipe)
	let suppressMobileTransition: boolean = $state(false);
	let popstateTimer: ReturnType<typeof setTimeout> | null = null;
	// Flag to track if we're closing directly from content (skip intermediate state)
	let closingFromContent: boolean = $state(false);
	// Track previous dialog open state to detect external closes while on content
	let prevDialogOpen: boolean = $state(false);
	// During iOS interactive back, ignore URL-sync effect until we settle
	let handlingPopState: boolean = $state(false);
	const isDesktop = $derived(mobileState.isDesktop);

	// Reset internal tab state when dialog closes so reopen shows the list by default
	$effect(() => {
		if (!open) {
			initializedDesktopFromUrl = false;
			activeMobileTab = '';
			closingFromContent = false;
		}
	});

	onMount(() => {
		// Detect iOS/iPadOS (including iPadOS 13+ which reports as Macintosh)
		const ua = navigator.userAgent;

		const isIOS =
			/iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);

		const onPopState = () => {
			if (isIOS) {
				// Defer applying URL-driven tab state to avoid mid-gesture jank
				handlingPopState = true;
				suppressMobileTransition = true;
				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						const params = new URLSearchParams(window.location.search);
						const tabParam = params.get('tab') ?? '';
						const allowed = new Set(visibleTabs.map((t) => t.value));
						activeMobileTab = tabParam && allowed.has(tabParam) ? tabParam : '';
						if (popstateTimer) clearTimeout(popstateTimer);
						popstateTimer = setTimeout(() => {
							suppressMobileTransition = false;
							handlingPopState = false;
							popstateTimer = null;
						}, 450);
					});
				});
				return;
			}
			// Non-iOS: apply immediately
			const params = new URLSearchParams(window.location.search);
			const tabParam = params.get('tab') ?? '';
			const allowed = new Set(visibleTabs.map((t) => t.value));
			activeMobileTab = tabParam && allowed.has(tabParam) ? tabParam : '';
		};
		window.addEventListener('popstate', onPopState);
		return () => window.removeEventListener('popstate', onPopState);
	});

	// Tab configuration
	const tabs = [
		{
			value: 'general',
			label: 'General',
			icon: BoltIcon,
			showForAllUsers: true
		},
		{
			value: 'members',
			label: 'Members',
			icon: UserIcon,
			showForAllUsers: false
		}
		// {
		// 	value: 'billing',
		// 	label: 'Billing',
		// 	icon: WalletIcon,
		// 	showForAllUsers: false
		// }
	];

	const visibleTabs = $derived(tabs.filter((tab) => tab.showForAllUsers || isOwnerOrAdmin));

	function handleMobileTabChange(value: string) {
		// Slight delay to allow tab state to update before showing content
		setTimeout(() => (activeMobileTab = value), 10);
		// Push shallow route via history so iOS doesn't trigger a full navigation
		const url = new URL(window.location.href);
		url.searchParams.set('tab', value);
		// Ensure dialog stays present in the URL and state while navigating tabs inside the dialog
		url.searchParams.set('dialog', 'organization-profile');

		goto(resolve(`${url.pathname}${url.search}${url.hash}` as Path), {
			shallow: true,
			state: { dialog: 'organization-profile' }
		});
	}

	function closeMobileTab() {
		// Remove tab param to return to list view within dialog (no navigation)
		const url = new URL(window.location.href);
		if (url.searchParams.has('tab')) {
			url.searchParams.delete('tab');
			// Keep dialog open in URL/state
			url.searchParams.set('dialog', 'organization-profile');

			goto(resolve(`${url.pathname}${url.search}${url.hash}` as Path), {
				shallow: true,
				replace: true,
				state: { dialog: 'organization-profile' }
			});
		}
		activeMobileTab = '';
	}

	function closeFromContent() {
		// Ensure the content panel is centered and static before closing the dialog.
		// We use double rAF so the DOM applies the class changes (full width, translate-x-0)
		// BEFORE we remove the dialog param and start the modal fade-out.
		closingFromContent = true;
		suppressMobileTransition = true;
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				const url = new URL(window.location.href);
				url.searchParams.delete('dialog');
				url.searchParams.delete('tab');
				goto(resolve(`${url.pathname}${url.search}${url.hash}` as Path), {
					shallow: true,
					replace: true
				});
				// Allow the dialog fade-out to complete, then reset flags.
				setTimeout(() => {
					suppressMobileTransition = false;
					closingFromContent = false;
				}, 400);
			});
		});
	}

	// Sync tabs with URL params
	$effect(() => {
		// Anchor to SvelteKit navigations, but read from window for instant shallow history updates
		void page.url;
		const sp = new URLSearchParams(window.location.search);
		const dialogOpen = sp.get('dialog') === 'organization-profile';
		const tabParam = sp.get('tab') ?? '';
		const allowed = new Set(visibleTabs.map((t) => t.value));
		const normalized = tabParam && allowed.has(tabParam) ? tabParam : 'general';

		// During iOS interactive back, onPopState already synced state.
		// Avoid extra churn here to prevent visual jank.
		if (handlingPopState) {
			prevDialogOpen = dialogOpen;
			return;
		}

		// If dialog just closed while we were on content, synthesize centered close
		if (!dialogOpen && prevDialogOpen && activeMobileTab !== '') {
			closingFromContent = true;
			suppressMobileTransition = true;
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					setTimeout(() => {
						suppressMobileTransition = false;
						closingFromContent = false;
					}, 400);
				});
			});
		}

		if (dialogOpen) {
			// Initialize desktop selection once from URL when dialog is open
			if (!initializedDesktopFromUrl) {
				activeDesktopTab = normalized;
				initializedDesktopFromUrl = true;
			}
			// Mobile overlay uses empty => list, value => content
			activeMobileTab = tabParam && allowed.has(tabParam) ? tabParam : '';
		} else {
			// Reset guards when dialog closes
			initializedDesktopFromUrl = false;
			// If we're closing directly from content, keep the content panel in place
			// so the modal fade-out appears to close from the content view without
			// briefly sliding back to the tabs list.
			if (!closingFromContent) {
				activeMobileTab = '';
			}
		}

		// Remember current open state for next run
		prevDialogOpen = dialogOpen;
	});

	// Desktop: keep URL `tab` param in sync with selected tab without adding history entries.
	// This ensures reload opens the same tab while Back closes the dialog (no tab history).
	$effect(() => {
		const currentTab = activeDesktopTab;
		// Only when dialog is open, not during iOS interactive back handling, and on desktop
		const sp = new URLSearchParams(window.location.search);
		const dialogOpen = sp.get('dialog') === 'organization-profile';
		if (!dialogOpen || handlingPopState || !isDesktop) return;

		const allowed = new Set(visibleTabs.map((t) => t.value));
		const normalized = allowed.has(currentTab) ? currentTab : 'general';

		const url = new URL(window.location.href);
		const existing = url.searchParams.get('tab');
		if (existing !== normalized) {
			url.searchParams.set('tab', normalized);
			// Ensure dialog param remains so OrganizationSwitcher keeps the dialog open on reload
			url.searchParams.set('dialog', 'organization-profile');

			goto(resolve(`${url.pathname}${url.search}${url.hash}` as Path), {
				shallow: true,
				replace: true,
				state: { dialog: 'organization-profile' }
			});
		}
	});
</script>

<Tabs.Root bind:value={activeDesktopTab} orientation="vertical" class="org-profile-root">
	<!-- ─────────── Desktop ─────────── -->
	<div class="org-desktop">
		<aside class="org-rail">
			<p class="org-rail-label">Organization</p>
			<Tabs.List class="org-rail-list">
				{#each visibleTabs as tab (tab.value)}
					<Tabs.Trigger value={tab.value} class="org-rail-tab">
						<tab.icon class="org-rail-icon" />
						<span>{tab.label}</span>
					</Tabs.Trigger>
				{/each}
			</Tabs.List>
		</aside>

		<div class="org-pane">
			<Tabs.Content value="general" class="org-tab-body">
				<header class="org-pane-head">
					<h2 class="org-pane-title">General</h2>
					<p class="org-pane-desc">Identity, address, and what happens to this organization.</p>
				</header>

				<GeneralSettings {initialData} />

				<div class="org-danger">
					<p class="org-section-label">Membership</p>
					<div class="org-danger-actions">
						<LeaveOrganization {initialData} />
						<DeleteOrganization {onSuccessfulDelete} {initialData} />
					</div>
				</div>
			</Tabs.Content>

			{#if isOwnerOrAdmin}
				<Tabs.Content value="members" class="org-tab-body">
					<header class="org-pane-head">
						<h2 class="org-pane-title">Members</h2>
						<p class="org-pane-desc">Who has access, and who has been invited.</p>
					</header>
					<MembersAndInvitations {initialData} />
				</Tabs.Content>
				<Tabs.Content value="billing" class="org-tab-body">
					<header class="org-pane-head">
						<h2 class="org-pane-title">Billing</h2>
					</header>
				</Tabs.Content>
			{/if}
		</div>
	</div>

	<!-- ─────────── Mobile ─────────── -->
	<div class="org-mobile">
		<div
			class="org-mobile-track"
			class:org-mobile-track--closing={closingFromContent}
			class:org-mobile-track--detail={!closingFromContent && activeMobileTab !== ''}
			class:org-mobile-track--animated={!suppressMobileTransition && !closingFromContent}
		>
			<div class="org-mobile-menu" class:org-mobile-menu--hidden={closingFromContent}>
				<div class="org-mobile-head">
					<p class="org-rail-label">Organization</p>
					<Button
						variant="ghost"
						size="icon"
						class="org-mobile-close"
						onclick={closeFromContent}
						aria-label="Close organization profile"
						type="button"
					>
						<XIcon />
					</Button>
				</div>

				<Tabs.List class="org-mobile-list">
					{#each visibleTabs as tab (tab.value)}
						<Tabs.Trigger
							value={tab.value}
							onclick={() => handleMobileTabChange(tab.value)}
							class="org-mobile-row"
						>
							<span class="org-mobile-row-icon"><tab.icon /></span>
							<span class="org-mobile-row-label">{tab.label}</span>
							<ChevronRightIcon class="org-mobile-row-go" />
						</Tabs.Trigger>
					{/each}
				</Tabs.List>
			</div>

			<div class="org-mobile-detail" class:org-mobile-detail--full={closingFromContent}>
				<Button
					variant="ghost"
					size="icon"
					class="org-mobile-back"
					onclick={closeMobileTab}
					aria-label="Go back to organization settings menu"
				>
					<ChevronLeftIcon />
				</Button>

				{#if activeMobileTab === 'general'}
					<header class="org-pane-head org-pane-head--mobile">
						<h2 class="org-pane-title">General</h2>
					</header>
					<GeneralSettings {initialData} />
					<div class="org-danger">
						<p class="org-section-label">Membership</p>
						<div class="org-danger-actions">
							<LeaveOrganization {initialData} />
							<DeleteOrganization {onSuccessfulDelete} {initialData} />
						</div>
					</div>
				{:else if activeMobileTab === 'members'}
					<header class="org-pane-head org-pane-head--mobile">
						<h2 class="org-pane-title">Members</h2>
					</header>
					<MembersAndInvitations {initialData} />
				{:else if activeMobileTab === 'billing'}
					<header class="org-pane-head org-pane-head--mobile">
						<h2 class="org-pane-title">Billing</h2>
					</header>
				{/if}
			</div>
		</div>
	</div>
</Tabs.Root>

<style>
	/* ── Shell ────────────────────────────────────────────────────────────────
	   Zero radius to match the app's Weathered Wall system; the sheet reads as
	   one editorial page split by a single hairline, not a card holding cards. */
	:global(.org-profile-root) {
		position: relative;
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 0;
		background: var(--popover);
	}

	.org-desktop {
		display: none;
		min-height: 0;
		height: 100%;
	}

	/* ── Rail ───────────────────────────────────────────────────────────────── */
	.org-rail {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		width: 12rem;
		flex-shrink: 0;
		padding: 1.25rem 0.75rem;
		border-right: 1px solid color-mix(in oklch, var(--border) 65%, transparent);
		background: color-mix(in oklch, var(--foreground) 2.5%, var(--popover));
		overflow-y: auto;
	}

	.org-rail-label {
		margin: 0;
		padding: 0 0.5rem;
		font-size: 0.5625rem;
		font-weight: 400;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: color-mix(in oklch, var(--foreground) 18%, var(--muted-foreground));
	}

	:global(.org-rail-list) {
		display: flex;
		flex-direction: column;
		gap: 0.0625rem;
		width: 100%;
		padding: 0;
		background: none;
		border-radius: 0;
	}

	:global(.org-rail-tab) {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		height: auto;
		padding: 0.4375rem 0.5rem;
		border: 0;
		border-radius: 0;
		background: none;
		box-shadow: none;
		font-size: 0.75rem;
		font-weight: 400;
		color: color-mix(in oklch, var(--foreground) 18%, var(--muted-foreground));
		transition:
			color 0.18s ease,
			background-color 0.18s ease;
	}
	:global(.org-rail-tab:hover) {
		color: var(--foreground);
		background: color-mix(in oklch, var(--foreground) 5%, transparent);
	}
	:global(.org-rail-tab[data-active]),
	:global(.org-rail-tab[aria-selected='true']) {
		color: var(--foreground);
		background: color-mix(in oklch, var(--foreground) 8%, transparent);
	}
	:global(.org-rail-tab:focus-visible) {
		outline: 1px solid var(--ring);
		outline-offset: -1px;
	}
	/* Kill the line-variant underline chrome from the primitive. */
	:global(.org-rail-tab::after) {
		display: none;
	}
	:global(.org-rail-icon) {
		width: 0.8125rem;
		height: 0.8125rem;
		flex-shrink: 0;
		opacity: 0.7;
	}

	/* ── Pane ───────────────────────────────────────────────────────────────── */
	.org-pane {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
		min-height: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
	}

	:global(.org-tab-body) {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		padding: 1.5rem 1.75rem 1.75rem;
		flex: 1;
	}

	.org-pane-head {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid color-mix(in oklch, var(--border) 65%, transparent);
	}
	.org-pane-head--mobile {
		padding-left: 2.25rem;
	}

	.org-pane-title {
		margin: 0;
		font-family: var(--font-heading);
		font-size: 1.375rem;
		font-weight: 400;
		line-height: 1.15;
		letter-spacing: -0.01em;
		color: var(--foreground);
	}

	.org-pane-desc {
		margin: 0;
		font-size: 0.75rem;
		line-height: 1.5;
		color: color-mix(in oklch, var(--foreground) 18%, var(--muted-foreground));
		max-width: 46ch;
	}

	/* ── Danger / membership strip ──────────────────────────────────────────── */
	.org-danger {
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
		margin-top: auto;
		padding-top: 1.25rem;
		border-top: 1px solid color-mix(in oklch, var(--border) 65%, transparent);
	}

	.org-section-label {
		margin: 0;
		font-size: 0.5625rem;
		font-weight: 400;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: color-mix(in oklch, var(--foreground) 18%, var(--muted-foreground));
	}

	.org-danger-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
	}

	/* ── Mobile ─────────────────────────────────────────────────────────────── */
	.org-mobile {
		position: relative;
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}

	.org-mobile-track {
		display: flex;
		width: 200%;
		height: 100%;
		transform: translateX(0);
	}
	.org-mobile-track--animated {
		transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
	}
	.org-mobile-track--detail {
		transform: translateX(-50%);
	}
	.org-mobile-track--closing {
		width: 100%;
		transform: none;
	}

	.org-mobile-menu {
		position: relative;
		width: 50%;
		flex-shrink: 0;
		height: 100%;
		padding: 1.25rem 0.875rem;
		overflow-y: auto;
	}
	.org-mobile-menu--hidden {
		display: none;
	}

	.org-mobile-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1.25rem;
	}

	/* Touch targets: keep the icon small but the hit area ≥44px. */
	:global(.org-mobile-close),
	:global(.org-mobile-back) {
		position: relative;
	}
	:global(.org-mobile-close)::after,
	:global(.org-mobile-back)::after {
		content: '';
		position: absolute;
		top: 50%;
		left: 50%;
		width: 44px;
		height: 44px;
		transform: translate(-50%, -50%);
	}
	:global(.org-mobile-close) {
		height: 1.75rem;
		width: 1.75rem;
		border-radius: 0;
		color: color-mix(in oklch, var(--foreground) 18%, var(--muted-foreground));
	}
	:global(.org-mobile-close:hover) {
		color: var(--foreground);
	}

	:global(.org-mobile-list) {
		display: flex;
		flex-direction: column;
		width: 100%;
		padding: 0;
		background: none;
		border-radius: 0;
	}

	:global(.org-mobile-row) {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		width: 100%;
		height: auto;
		padding: 0.6875rem 0.25rem;
		border: 0;
		border-top: 1px solid color-mix(in oklch, var(--border) 45%, transparent);
		border-radius: 0;
		background: none;
		box-shadow: none;
		font-size: 0.8125rem;
		color: var(--foreground);
		justify-content: flex-start;
	}
	:global(.org-mobile-row:first-child) {
		border-top: 0;
	}
	:global(.org-mobile-row::after) {
		display: none;
	}
	:global(.org-mobile-row:focus-visible) {
		outline: 1px solid var(--ring);
		outline-offset: -1px;
	}

	.org-mobile-row-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.625rem;
		height: 1.625rem;
		flex-shrink: 0;
		border: 1px solid color-mix(in oklch, var(--foreground) 14%, transparent);
	}
	.org-mobile-row-icon :global(svg) {
		width: 0.8125rem;
		height: 0.8125rem;
		opacity: 0.7;
	}

	.org-mobile-row-label {
		flex: 1;
		text-align: left;
	}

	:global(.org-mobile-row-go) {
		width: 0.875rem;
		height: 0.875rem;
		flex-shrink: 0;
		color: color-mix(in oklch, var(--foreground) 18%, var(--muted-foreground));
	}

	.org-mobile-detail {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		width: 50%;
		flex-shrink: 0;
		height: 100%;
		padding: 1.25rem 0.875rem 1.5rem;
		overflow-y: auto;
		overscroll-behavior: contain;
	}
	.org-mobile-detail--full {
		position: absolute;
		inset: 0;
		width: 100%;
	}

	:global(.org-mobile-back) {
		position: absolute;
		top: 1.0625rem;
		left: 0.125rem;
		z-index: 2;
		height: 1.75rem;
		width: 1.75rem;
		border-radius: 0;
		color: color-mix(in oklch, var(--foreground) 18%, var(--muted-foreground));
	}
	:global(.org-mobile-back:hover) {
		color: var(--foreground);
	}

	/* ── Breakpoint ─────────────────────────────────────────────────────────── */
	@media (min-width: 768px) {
		.org-desktop {
			display: flex;
		}
		.org-mobile {
			display: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.org-mobile-track--animated {
			transition: none;
		}
		:global(.org-rail-tab) {
			transition: none;
		}
	}
</style>
