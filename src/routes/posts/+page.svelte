<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { Path } from '$app/types';
	import RevealItem from '#lib/components/RevealItem.svelte';
	import PostFilters from '#lib/posts/ui/PostFilters.svelte';
	import PostSlab from '#lib/posts/ui/PostSlab.svelte';
	import {
		readFilters,
		toggleTag,
		writeFilters,
		type FeedFilters
	} from '#lib/posts/ui/feed-filters';
	import { Skeleton } from '#lib/ui/skeleton';
	import { usePaginatedQuery, useQuery } from 'convex-svelte';
	import { api } from '#convex/_generated/api';
	import { ListFilter } from '@lucide/svelte';
	import * as Empty from '#lib/ui/empty';
	import { m } from '#lib/paraglide/messages.js';

	const PAGE_SIZE = 5;
	const MORE_SIZE = 15;
	/** Fixed, uniquely keyed placeholders — index keys are not stable identities. */
	const LOADING_ROWS = [1, 2, 3, 4];

	// The selected filters. One `$state` object, one writer below, and a single URL
	// write per change — nothing watches the selection to keep it in sync.
	//
	// Seeded from the query string, so a link that names a category or tag opens the
	// view it names. The URL is written by `applyFilters` but never read back: a
	// shallow `goto` updates the address bar without touching `page.url` (Kit 3
	// reports it as `page.shallow.url`), so reading it back returns a stale value —
	// which is how the three sync effects used to clobber each other's parameters.
	let filters = $state<FeedFilters>(readFilters(page.url));

	/** The one write path: new filters in, same URL out. */
	function applyFilters(next: FeedFilters) {
		filters = next;
		const url = writeFilters(page.url, next);
		void goto(resolve(`${url.pathname}${url.search}` as Path), {
			shallow: true,
			replace: true,
			state: page.state
		});
	}

	/** Changing a filter closes the open post — it may not survive the new list. */
	function setFilters(next: Partial<Omit<FeedFilters, 'postId'>>) {
		applyFilters({ ...filters, ...next, postId: null });
	}

	const queryArgs = $derived({
		category: filters.category ?? undefined,
		tags: filters.tags.length > 0 ? filters.tags : undefined
	});

	// One argument-free query for the whole filter vocabulary: the categories, every
	// tag, and each category's tags. Nothing here re-subscribes when a filter
	// changes — the client picks the slice it needs out of one value it already has.
	const facetsQuery = useQuery(api.posts.queries.listPostFacets);
	const categories = $derived(facetsQuery.data?.categories ?? []);

	// Tags are scoped to the selected category, so a chip can never offer a tag
	// that has no posts in the category the reader is looking at. A Map, not the
	// record, because category names are free-form user data and a `Map` lookup
	// cannot be fooled by a key like `constructor`.
	const tagsByCategory = $derived(new Map(Object.entries(facetsQuery.data?.tagsByCategory ?? {})));

	// Already-selected tags stay offered even when the category does not have
	// them: a shared link can name a tag outside the category, and a filter with
	// no chip is a filter that cannot be switched off.
	const tagOptions = $derived([
		...new Set([
			...(filters.category
				? (tagsByCategory.get(filters.category) ?? [])
				: (facetsQuery.data?.tags ?? [])),
			...filters.tags
		])
	]);

	const paginatedPosts = usePaginatedQuery(
		api.posts.queries.listPublicPostsPaginated,
		() => queryArgs,
		{ initialNumItems: PAGE_SIZE }
	);

	const posts = $derived(paginatedPosts.results ?? []);

	// The match count, without a query that counts. `Exhausted` means every match is
	// already in `posts`, so their length *is* the total; while more remain the chip
	// shows nothing rather than a number that is really a page size.
	const total = $derived(paginatedPosts.status === 'Exhausted' ? posts.length : null);
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
		<PostFilters
			category={filters.category}
			selectedTags={filters.tags}
			{tagOptions}
			{categories}
			{total}
			onCategoryChange={(category) => setFilters({ category })}
			onTagToggle={(tag) => setFilters({ tags: toggleTag(filters.tags, tag) })}
		/>
	</RevealItem>
</section>

<section class="post-list">
	{#if paginatedPosts.status === 'LoadingFirstPage'}
		<div class="loading">
			{#each LOADING_ROWS as row (row)}<Skeleton class="loading-skeleton" />{/each}
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
					isOpen={post._id === filters.postId}
					onselect={(postId) => applyFilters({ ...filters, postId })}
				/>
			</RevealItem>
		{/each}

		{#if paginatedPosts.status === 'CanLoadMore'}
			<button class="load-more" onclick={() => paginatedPosts.loadMore(MORE_SIZE)}
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
