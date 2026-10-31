<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import RevealItem from '#lib/components/RevealItem.svelte';
	import PostFilters from '#lib/posts/ui/PostFilters.svelte';
	import PostSlab from '#lib/posts/ui/PostSlab.svelte';
	import { Skeleton } from '#lib/ui/skeleton';
	import { usePaginatedQuery, useQuery } from 'convex-svelte';
	import { api } from '#convex/_generated/api';
	import { ListFilter } from '@lucide/svelte';
	import * as Empty from '#lib/ui/empty';

	import { browser } from '$app/env';
	import { untrack } from 'svelte';

	// `page.url` may only be read during render on the server (Kit 3 guards
	// against cross-request leakage), so the initial filter state is seeded from
	// the query string on the client only. SSR renders the unfiltered list, which
	// the client then narrows once hydrated.
	let selectedPostId = $state<string | null>(null);
	let filterTags = $state<string[]>([]);
	let filterCategory = $state<string | null>(null);

	// Seed the filter state from the query string exactly once, after mount.
	// `page.url` is not readable on the server outside render, and reading it
	// inside a tracking effect would re-arm on every write below.
	$effect(() => {
		if (!browser) return;
		const params = page.url.searchParams;
		untrack(() => {
			selectedPostId = params.get('postId');
			filterTags = params.get('tags')?.split(',').filter(Boolean) ?? [];
			filterCategory = params.get('category');
		});
	});

	// Mirror filter state into the URL without a round trip. The last value we
	// wrote is remembered because `page.url` only updates after `goto` resolves,
	// so comparing against it re-fires the effect forever.
	let lastSearch = '';
	function syncUrl(param: string, value: string | null) {
		if (!browser) return;
		const url = new URL(page.url.href);
		if (value) url.searchParams.set(param, value);
		else url.searchParams.delete(param);
		if (url.search === lastSearch || url.search === page.url.search) return;
		lastSearch = url.search;
		void goto(url, { state: page.state, shallow: true, replace: true });
	}
	$effect(() => {
		syncUrl('postId', selectedPostId);
	});
	$effect(() => {
		syncUrl('tags', filterTags.length > 0 ? filterTags.join(',') : null);
	});
	$effect(() => {
		syncUrl('category', filterCategory);
	});

	const tagsQuery = useQuery(api.posts.queries.listTags);
	const paginatedPosts = usePaginatedQuery(
		api.posts.queries.listPublicPostsPaginated,
		() => ({
			tags: filterTags.length > 0 ? filterTags : undefined,
			category: filterCategory ?? undefined
		}),
		{ initialNumItems: 5 }
	);

	const posts = $derived(paginatedPosts.results ?? []);
	const totalPosts = $derived(posts.length);

	import { m } from '#lib/paraglide/messages.js';
</script>

<svelte:head><title>{m.long_lemur_clap()}</title></svelte:head>

<section class="hero">
	<RevealItem delay={0}><h1 class="hero-heading">{m.jolly_gazelle_surge()}</h1></RevealItem>
	<RevealItem delay={150}>
		<p class="hero-desc">
			{m.sharp_snipe_twist()}
		</p>
	</RevealItem>
	<RevealItem delay={250}><div class="hero-rule" aria-hidden="true"></div></RevealItem>
</section>

<section class="filters-section">
	<RevealItem delay={0}>
		<PostFilters bind:filterCategory bind:filterTags tags={tagsQuery.data ?? []} {totalPosts} />
	</RevealItem>
</section>

<section class="post-list">
	{#if paginatedPosts.status === 'LoadingFirstPage'}
		<div class="loading">
			{#each Array(4) as _, i (i)}<Skeleton class="loading-skeleton" />{/each}
		</div>
	{:else if posts.length === 0}
		<Empty.Root>
			<Empty.Media variant="icon"><ListFilter size={16} /></Empty.Media>
			<Empty.Header>
				<Empty.Title>{m.solid_trout_place()}</Empty.Title>
				<Empty.Description>{m.bland_trout_flock()}</Empty.Description>
			</Empty.Header>
		</Empty.Root>
	{:else}
		{#each posts as post, i (post._id)}
			<RevealItem delay={i * 60}>
				<PostSlab
					{post}
					index={i}
					isOpen={post._id === selectedPostId}
					onselect={(id) => (selectedPostId = id)}
				/>
			</RevealItem>
		{/each}

		{#if paginatedPosts.status === 'CanLoadMore'}
			<button class="load-more" onclick={() => paginatedPosts.loadMore(15)}
				>{m.wise_seal_knit()}</button
			>
		{:else if paginatedPosts.status === 'LoadingMore'}
			<p class="loading-more">{m.rapid_duck_flip()}</p>
		{/if}
	{/if}
</section>

<footer class="footer">
	<span class="footer-text">{m.jolly_falcon_hop()}</span>
</footer>

<style>
	.hero {
		padding: 4rem 0 2rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.hero-heading {
		font-family: var(--font-heading);
		font-size: clamp(1.25rem, 3vw, 1.5rem);
		font-weight: 400;
		letter-spacing: -0.01em;
		margin: 0;
	}
	.hero-desc {
		font-size: 0.75rem;
		line-height: 1.6;
		color: var(--muted-foreground);
		opacity: 0.6;
		max-width: 26rem;
		margin: 0;
	}
	.hero-rule {
		width: 20%;
		height: 1px;
		background: var(--border);
		margin-top: 1rem;
	}
	.filters-section {
		padding: 0 0 0.5rem;
	}
	.post-list {
		padding: 0 0 3rem;
		display: flex;
		flex-direction: column;
	}

	.loading {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.25rem 0;
	}
	/* ponytail: :global — .loading-skeleton is on Skeleton (child component) */
	:global(.loading-skeleton) {
		height: 3.5rem;
		width: 100%;
	}

	.load-more {
		display: block;
		width: 100%;
		padding: 1rem;
		background: none;
		border: none;
		border-bottom: 1px solid var(--border);
		font-size: 0.6875rem;
		color: var(--muted-foreground);
		cursor: pointer;
		transition: color 0.15s;
	}
	.load-more:hover {
		color: var(--foreground);
	}
	.loading-more {
		font-size: 0.625rem;
		color: var(--muted-foreground);
		opacity: 0.4;
		text-align: center;
		padding: 1rem;
	}

	.footer {
		display: flex;
		justify-content: center;
		padding: 2rem 0;
	}
	.footer-text {
		font-size: 0.5625rem;
		font-weight: 350;
		letter-spacing: 0.03em;
		color: var(--muted-foreground);
		opacity: 0.3;
	}

	@media (max-width: 640px) {
		.hero {
			padding: 3rem 0 1.5rem;
		}
		.hero-heading {
			font-size: 1.35rem;
		}
	}
</style>
