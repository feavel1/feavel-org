<!--
	THESIS: One workshop surface — dot-field, architectural spine, and warm greige palette become the
	universal shell. The shadcn header bar is gone. Navigation, auth, and utilities live as quiet
	typographic elements in the nav bar: text on surface, nothing more. The user enters a studio,
	not a dashboard.

	OWN-WORLD: The Weathered Wall — dot-grid texture, 15% spine, warm neutral palette (oklch ~85 hue),
	Inter 350 weight, thin serif headings, sharp corners, no shadows, no gradients.

	STORY: The visitor discovers content at their own pace. Tools (search, sign-in, organizations)
	are available but don't announce themselves. The work speaks first.

	FIRST VIEWPORT: Dot-field background, "feavel" in tiny lowercase at top-left, nav links in
	uppercase 0.6875rem, ⌘ and user indicators as ghosted elements on the far right, hero content
	anchored to the 15% spine below.

	FORM: The Weathered Wall applied to shell — nav bar is minimal text links + subtle utility
	markers, player bar anchors the bottom, content column is 48rem default with CSS variable
	override for wide pages (--content-max-width).
-->
<script lang="ts">
	import { page } from '$app/state';
	import { locales, localizeHref } from '#lib/paraglide/runtime.js';
	import { resolve } from '$app/paths';
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import { createSvelteAuthClient } from '@mmailaender/convex-better-auth-svelte/svelte';
	import { authClient } from '#lib/auth/api/auth-client.js';
	import { api } from '#convex/_generated/api';
	import { AUTH_CONSTANTS } from '#convex/auth.constants';
	import { Toaster } from '#lib/ui/sonner/index.js';
	import OrganizationSwitcher from '#lib/organizations/ui/OrganizationSwitcher.svelte';
	import UserButton from '#lib/users/ui/UserButton.svelte';
	import AuthProvider from '#lib/auth/ui/AuthProvider.svelte';
	import MobileNav from '#lib/components/navigation/MobileNav.svelte';
	import NavControls from '#lib/components/navigation/NavControls.svelte';
	import { navLinks, type ResolvedHref } from '#lib/components/navigation/nav-links.js';
	import SearchButton from '#lib/components/navigation/SearchButton.svelte';
	import UserProfileHost from '#lib/users/ui/UserProfileHost.svelte';
	import OrganizationProfileHost from '#lib/organizations/ui/OrganizationProfileHost.svelte';
	import { ModeWatcher } from 'mode-watcher';
	import SearchOverlay from '#lib/components/search/SearchOverlay.svelte';
	import AudioControls from '#lib/player/AudioControls.svelte';

	let { children, data } = $props();

	createSvelteAuthClient({ authClient: authClient, getServerState: () => data.authState });
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<Toaster position="top-center" />
<ModeWatcher />

<div style="display:none">
	{#each locales as locale (locale)}
		<!-- localized paths are runtime-generated prefixes, not statically known routes -->
		<a href={localizeHref(page.url.pathname, { locale })}>{locale}</a>
	{/each}
</div>

<AuthProvider {api} {authClient} authConstants={AUTH_CONSTANTS}>
	<div class="surface">
		<div class="dot-field" aria-hidden="true"></div>
		<div class="spine" aria-hidden="true"></div>

		<!-- Nav: brand + links + utilities, all as SurfaceLayout text -->
		<nav class="nav">
			<div class="nav-left">
				<a href={resolve('/')} class="nav-brand">feavel</a>
				<div class="nav-links">
					{#each navLinks as link (link.href)}
						<a href={link.href as ResolvedHref} class="nav-link">{link.label()}</a>
					{/each}
				</div>
			</div>

			<div class="nav-utils">
				<!-- Account cluster leads the group. Every state it can render in
				     (signed-out / checking / org+avatar) is pinned to the same
				     fixed height, so nothing above or below it moves. -->
				<div class="nav-account">
					{#if AUTH_CONSTANTS.organizations}
						<OrganizationSwitcher initialData={data.initialData} />
					{/if}
					<UserButton initialData={data.initialData} />
				</div>
				<span class="nav-divider" aria-hidden="true"></span>
				<SearchButton />
				<NavControls />
				<MobileNav />
			</div>
		</nav>

		<!-- Content column: default 48rem, overridable via --content-max-width -->
		<div class="content">
			{@render children()}
		</div>

		<AudioControls />
	</div>

	<SearchOverlay />

	<UserProfileHost initialData={data.initialData} />

	{#if AUTH_CONSTANTS.organizations}
		<OrganizationProfileHost initialData={data.initialData} />
	{/if}
</AuthProvider>

<style>
	/* ── Surface shell ── */
	.surface {
		position: relative;
		min-height: 100dvh;
		background: var(--background);
		color: var(--foreground);
		font-family: var(--font-sans);
		font-weight: 350;
		animation: surface-in 0.8s ease both;
	}
	@keyframes surface-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	/* ── Dot-grid texture ── */
	.dot-field {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 0;
		background-image: radial-gradient(circle, var(--foreground) 0.35px, transparent 0.35px);
		background-size: 12px 12px;
		opacity: 0.06;
		mask-image: linear-gradient(
			to bottom,
			var(--foreground) 5%,
			var(--foreground) 8%,
			transparent 15%,
			transparent 80%,
			var(--foreground) 88%,
			var(--foreground) 100%
		);
	}

	/* ── Architectural spine ── */
	.spine {
		position: fixed;
		top: 0;
		left: 15%;
		bottom: 0;
		width: 1px;
		background: var(--border);
		z-index: 0;
		opacity: 0;
		animation: spine-in 1s 0.2s ease both;
	}
	@keyframes spine-in {
		to {
			opacity: 0.4;
		}
	}
	@media (max-width: 1024px) {
		.spine {
			display: none;
		}
	}

	/* ── Nav bar ── */
	.nav {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.25rem 0 1.25rem;
		margin: 0 auto;
		max-width: 48rem;
		animation: nav-down 0.6s 0.1s ease both;
	}
	@keyframes nav-down {
		from {
			opacity: 0;
			transform: translateY(-0.5rem);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.nav-left {
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}

	.nav-brand {
		font-size: 0.75rem;
		font-weight: 350;
		letter-spacing: 0.05em;
		text-transform: lowercase;
		text-decoration: none;
		line-height: 1;
		color: var(--muted-foreground);
	}

	.nav-links {
		display: none;
		align-items: center;
		gap: 1.5rem;
	}
	@media (min-width: 768px) {
		.nav-links {
			display: flex;
		}
	}

	.nav-link {
		font-size: 0.6875rem;
		font-weight: 400;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		text-decoration: none;
		line-height: 1;
		color: var(--muted-foreground);
		transition: color 0.2s;
	}
	.nav-link:hover {
		color: var(--foreground);
	}

	.nav-utils {
		display: flex;
		align-items: center;
		gap: 0.875rem;
		min-height: var(--nav-util-size);
	}

	/* One fixed box for every account state. The cluster never reflows to a
	   different height while Convex re-confirms the token. */
	.nav-account {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		height: var(--nav-util-size);
		flex-shrink: 0;
	}

	.nav-divider {
		width: 1px;
		height: 1rem;
		background: var(--border);
		flex-shrink: 0;
		margin-inline: 0.125rem;
	}

	/* Align all utility children consistently — inline-flex keeps the box at
	   content height so `line-height: normal` cannot inflate the nav row. */
	.nav-utils :global(> *) {
		display: inline-flex;
		align-items: center;
	}

	.nav-utils :global(> .nav-account) {
		display: flex;
	}

	/* ── Content column ── */
	.content {
		position: relative;
		z-index: 1;
		margin: 0 auto;
		max-width: var(--content-max-width, 48rem);
		padding: 0 0 3rem;
	}

	/* ── Desktop spine offset ── */
	@media (min-width: 1025px) {
		.content {
			margin-left: calc(15% + 2rem);
			margin-right: auto;
		}
		.nav {
			margin-left: calc(15% + 2rem);
			margin-right: auto;
		}
	}
	@media (max-width: 1024px) {
		.content {
			padding-left: 1.25rem;
			padding-right: 1.25rem;
		}
		.nav {
			padding-left: 1.25rem;
			padding-right: 1.25rem;
		}
	}

	/* Utility for pages that need wide content (games, editor) */
	:global(.content-wide) {
		--content-max-width: 64rem;
	}
</style>
