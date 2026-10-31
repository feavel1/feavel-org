<script lang="ts">
	import { resolve } from '$app/paths';
	import * as Command from '#lib/ui/command';
	import { useConvexClient } from 'convex-svelte';
	import { api } from '#convex/_generated/api';
	import {
		Home,
		FileText,
		PenSquare,
		Swords,
		Gamepad2,
		Search,
		LoaderCircle
	} from '@lucide/svelte';
	import { searchOverlay } from '#lib/components/navigation/controls.svelte.js';
	import { onDestroy } from 'svelte';

	let open = $derived(searchOverlay.open);
	let inputValue = $state('');

	// Fresh palette every time it opens.
	$effect(() => {
		if (!open) {
			inputValue = '';
			searchQuery = '';
			searchResults = [];
			searchError = false;
		}
	});
	let searchQuery = $state('');
	let searchResults = $state<{ _id: string; title?: string }[]>([]);
	let searching = $state(false);
	let searchError = $state(false);
	let q = $derived(searchQuery.toLowerCase());

	const navItems: { label: string; href: string; icon: typeof Home }[] = [
		{ label: 'Home', href: resolve('/'), icon: Home },
		{ label: 'Browse Posts', href: resolve('/posts'), icon: FileText },
		{ label: 'Post Editor', href: resolve('/posts/editor'), icon: PenSquare },
		{ label: 'Games', href: resolve('/games'), icon: Gamepad2 },
		{ label: 'Chess', href: resolve('/games/chess'), icon: Swords }
	];

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

<Command.Dialog
	bind:open
	shouldFilter={false}
	class="!gap-0 !rounded-none !p-0 !ring-0 sm:max-w-[520px]"
	onOpenChange={(next) => {
		if (!next) searchOverlay.hide();
	}}
>
	<div class="cmd-main" role="presentation">
		<Command.Input
			bind:value={inputValue}
			placeholder="Search posts…  ⌘K"
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
	</div>
</Command.Dialog>

<svelte:document
	onkeydown={(e) => {
		if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			searchOverlay.toggle();
		}
	}}
/>

<style>
	.cmd-main {
		display: flex;
		flex-direction: column;
		width: 520px;
		max-width: 90vw;
		min-height: 0;
		overflow: hidden;
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
