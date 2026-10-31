<script lang="ts">
	import { resolve } from '$app/paths';
	import { locales, setLocale } from '#lib/paraglide/runtime';
	import { mode, setMode, resetMode } from 'mode-watcher';
	import * as Command from '#lib/ui/command';
	import { useConvexClient } from 'convex-svelte';
	import { api } from '#convex/_generated/api';
	import {
		Home,
		FileText,
		PenSquare,
		Swords,
		Gamepad2,
		Settings,
		Search,
		Sun,
		Moon,
		Monitor,
		LoaderCircle
	} from '@lucide/svelte';
	import { cn } from '#lib/utils.js';
	import { onDestroy } from 'svelte';

	let open = $state(false);
	let searchQuery = $state('');
	let searchResults = $state<{ _id: string; title?: string }[]>([]);
	let searching = $state(false);
	let searchError = $state(false);
	let q = $derived(searchQuery.toLowerCase());

	let railTab = $state<'nav' | 'settings'>('nav');

	// Reset rail tab whenever palette opens
	$effect(() => {
		if (open) railTab = 'nav';
	});

	// Read current theme mode for active indicator
	let currentMode = $derived<'light' | 'dark' | 'system'>(
		(mode.current as 'light' | 'dark' | 'system') ?? 'system'
	);

	type ThemeMode = 'light' | 'dark' | 'system';

	const navItems: { label: string; href: string; icon: typeof Home }[] = [
		{ label: 'Home', href: resolve('/'), icon: Home },
		{ label: 'Browse Posts', href: resolve('/posts'), icon: FileText },
		{ label: 'Post Editor', href: resolve('/posts/editor'), icon: PenSquare },
		{ label: 'Games', href: resolve('/games'), icon: Gamepad2 },
		{ label: 'Chess', href: resolve('/games/chess'), icon: Swords }
	];

	const themeModes: { label: string; mode: ThemeMode; icon: typeof Sun }[] = [
		{ label: 'Light', mode: 'light', icon: Sun },
		{ label: 'Dark', mode: 'dark', icon: Moon },
		{ label: 'System', mode: 'system', icon: Monitor }
	];

	const localeLabels: Record<string, string> = {
		en: 'English',
		ru: 'Русский',
		zh: '中文'
	};

	function applyTheme(mode: ThemeMode) {
		if (mode === 'system') {
			resetMode();
		} else {
			setMode(mode);
		}
		open = false;
	}

	function applyLocale(locale: (typeof locales)[number]) {
		setLocale(locale);
		open = false;
	}

	function onDialogKeydown(e: KeyboardEvent) {
		// Escape in settings tab goes back to nav
		if (e.key === 'Escape' && railTab !== 'nav') {
			e.preventDefault();
			e.stopPropagation();
			railTab = 'nav';
		}
	}

	let filteredNav = $derived(
		!q ? navItems : navItems.filter((i) => i.label.toLowerCase().includes(q))
	);

	const client = useConvexClient();

	let debounceTimer: ReturnType<typeof setTimeout>;
	async function onSearchInput(val: string) {
		searchQuery = val;
		searchError = false;
		if (!val.trim()) {
			searchResults = [];
			return;
		}
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(async () => {
			searching = true;
			try {
				const res = await client.action(api.rag.searchPosts, { query: val });
				searchResults = res.results ?? [];
			} catch {
				searchResults = [];
				searchError = true;
			} finally {
				searching = false;
			}
		}, 300);
	}

	onDestroy(() => clearTimeout(debounceTimer));
</script>

<!-- ⌘ trigger -->
<button
	type="button"
	class="cmd-trigger"
	onclick={() => (open = true)}
	aria-label="Open command palette"
>
	<span class="cmd-short">⌘</span>
	<span class="cmd-full">⌘K</span>
</button>

<Command.Dialog
	bind:open
	shouldFilter={false}
	class="!gap-0 !rounded-none !p-0 !ring-0 sm:max-w-[520px]"
>
	<div class="cmd-palette" onkeydown={onDialogKeydown} role="presentation">
		<!-- Left rail -->
		<div class="cmd-rail">
			<button
				type="button"
				class={cn('cmd-rail-btn', railTab === 'nav' && 'cmd-rail-btn-active')}
				onclick={() => (railTab = 'nav')}
				aria-label="Navigation"
				title="Navigate"
			>
				<Home class="size-4" />
			</button>
			<button
				type="button"
				class={cn('cmd-rail-btn', railTab === 'settings' && 'cmd-rail-btn-active')}
				onclick={() => (railTab = 'settings')}
				aria-label="Settings"
				title="Settings"
			>
				<Settings class="size-4" />
			</button>
		</div>

		<!-- Main panel -->
		<div class="cmd-main">
			{#if railTab === 'nav'}
				<Command.Input
					placeholder="Type a command or search posts..."
					oninput={(e) => onSearchInput((e.target as HTMLInputElement).value)}
				/>
				<Command.List>
					{#if searching}
						<div class="cmd-searching">
							<LoaderCircle class="size-3 animate-spin" />
							<span>Searching...</span>
						</div>
					{/if}

					{#if searchQuery && searchResults.length > 0}
						<Command.Group heading="Search Results">
							{#each searchResults as r (r._id)}
								<Command.LinkItem href={`/posts?postId=${r._id}`}>
									<Search />
									<span>{r.title || '(untitled)'}</span>
								</Command.LinkItem>
							{/each}
						</Command.Group>
						<Command.Separator />
					{/if}

					{#if searchQuery && !searching && searchResults.length === 0 && !searchError}
						<div class="cmd-empty">No posts found for "{searchQuery}"</div>
					{/if}

					{#if searchError}
						<div class="cmd-empty">Search unavailable — try again</div>
					{/if}

					{#if filteredNav.length > 0}
						<Command.Group heading="Navigate">
							{#each filteredNav as n (n.label)}
								<Command.LinkItem href={n.href}>
									<n.icon />
									<span>{n.label}</span>
								</Command.LinkItem>
							{/each}
						</Command.Group>
					{:else if searchQuery && !searching}
						<div class="cmd-empty">No matches</div>
					{/if}
				</Command.List>
			{:else if railTab === 'settings'}
				<div class="cmd-panel">
					<div class="cmd-panel-section">
						<div class="cmd-panel-header">Theme</div>
						<div class="cmd-theme-grid">
							{#each themeModes as t (t.mode)}
								<button
									type="button"
									class={cn('cmd-theme-card', currentMode === t.mode && 'cmd-theme-card-active')}
									onclick={() => applyTheme(t.mode)}
								>
									<t.icon class="size-5" />
									<span>{t.label}</span>
								</button>
							{/each}
						</div>
					</div>

					<div class="cmd-panel-section">
						<div class="cmd-panel-header">Language</div>
						<div class="cmd-lang-list">
							{#each locales as locale (locale)}
								<button type="button" class="cmd-lang-item" onclick={() => applyLocale(locale)}>
									<span class="cmd-lang-code">{locale.toUpperCase()}</span>
									<span class="cmd-lang-name">{localeLabels[locale] ?? locale}</span>
								</button>
							{/each}
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
</Command.Dialog>

<svelte:document
	onkeydown={(e) => {
		if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			open = !open;
		}
	}}
/>

<style>
	.cmd-trigger {
		display: inline-flex;
		align-items: center;
		font-size: 0.6875rem;
		font-weight: 400;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		line-height: 1;
		color: var(--muted-foreground);
		opacity: 0.45;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		transition: opacity 0.2s;
	}
	.cmd-trigger:hover {
		opacity: 0.7;
	}

	.cmd-short {
		display: inline;
	}
	.cmd-full {
		display: none;
	}
	@media (min-width: 640px) {
		.cmd-short {
			display: none;
		}
		.cmd-full {
			display: inline;
		}
	}

	/* ── Split layout ── */
	.cmd-palette {
		display: flex;
		width: 520px;
		max-width: 90vw;
		height: 336px;
		max-height: 60vh;
		overflow: hidden;
	}

	/* ── Left rail ── */
	.cmd-rail {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		width: 48px;
		padding: 0.5rem 0;
		border-right: 1px solid var(--border);
		flex-shrink: 0;
	}

	.cmd-rail-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border: none;
		background: transparent;
		color: var(--muted-foreground);
		opacity: 0.45;
		cursor: pointer;
		border-radius: 0;
		transition:
			opacity 0.15s,
			color 0.15s;
	}

	.cmd-rail-btn:hover {
		opacity: 0.7;
		color: var(--foreground);
	}

	.cmd-rail-btn-active {
		opacity: 1;
		color: var(--foreground);
	}

	/* ── Main panel ── */
	.cmd-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
		overflow: hidden;
	}

	/* ── Panels (theme, lang) ── */
	.cmd-panel {
		padding: 1.25rem;
		height: 100%;
		overflow-y: auto;
	}

	.cmd-panel-section {
		margin-bottom: 2rem;
	}
	.cmd-panel-section:last-child {
		margin-bottom: 0;
	}

	.cmd-panel-header {
		font-family: var(--font-heading);
		font-size: 1rem;
		font-weight: 400;
		letter-spacing: -0.01em;
		color: var(--foreground);
		margin-bottom: 1.25rem;
	}

	/* ── Theme cards ── */
	.cmd-theme-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.75rem;
	}

	.cmd-theme-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 1.25rem 0.75rem;
		border: 1px solid var(--border);
		background: transparent;
		color: var(--muted-foreground);
		cursor: pointer;
		border-radius: 0;
		font-size: 0.6875rem;
		font-weight: 400;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		transition:
			border-color 0.2s,
			color 0.15s;
	}

	.cmd-theme-card:hover {
		border-color: var(--muted-foreground);
		color: var(--foreground);
		transform: translateY(-1px);
	}

	.cmd-theme-card-active {
		border-color: var(--foreground);
		color: var(--foreground);
	}

	/* ── Language list ── */
	.cmd-lang-list {
		display: flex;
		flex-direction: column;
	}

	.cmd-lang-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.625rem 0;
		border: none;
		background: transparent;
		color: var(--muted-foreground);
		cursor: pointer;
		border-radius: 0;
		font-family: var(--font-sans);
		transition: color 0.15s;
		width: 100%;
		text-align: left;
	}

	.cmd-lang-item:hover {
		color: var(--foreground);
	}

	.cmd-lang-code {
		font-size: 0.6875rem;
		font-weight: 400;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		width: 2rem;
		flex-shrink: 0;
		color: var(--foreground);
	}

	.cmd-lang-name {
		font-size: 0.8125rem;
		font-weight: 350;
	}

	/* ── Searching indicator ── */
	.cmd-searching {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		font-size: 0.6875rem;
		font-weight: 400;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--muted-foreground);
	}

	/* ── Empty / error states ── */
	.cmd-empty {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.25rem 1rem;
		font-size: 0.6875rem;
		font-weight: 400;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--muted-foreground);
		opacity: 0.55;
	}
</style>
