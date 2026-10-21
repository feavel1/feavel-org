<script lang="ts">
	import { page } from '$app/state';
	import type { Id } from '#convex/_generated/dataModel';
	import PostEditorSlab from '$lib/posts/ui/PostEditorSlab.svelte';
	import { useQuery, useConvexClient } from 'convex-svelte';
	import { api } from '#convex/_generated/api';
	import { Skeleton } from '$lib/ui/skeleton';
	import * as Empty from '$lib/ui/empty';
	import { FileEdit } from '@lucide/svelte';
	import { goto } from '$app/navigation';

	let selectedPostId = $state<Id<'posts'> | null>(
		page.url.searchParams.get('postId') as Id<'posts'> | null
	);

	// Mirror selection into the URL without a round trip. The last value we
	// wrote is remembered because `page.url` only updates after `goto` resolves,
	// so comparing against it re-fires the effect forever. `page.state` is not
	// read here: it is a tracked proxy, and feeding it back into `goto` makes
	// the write itself a dependency -> infinite navigation loop.
	let lastSearch = '';
	$effect(() => {
		const url = new URL(page.url.href);
		if (selectedPostId) url.searchParams.set('postId', selectedPostId);
		else url.searchParams.delete('postId');
		if (url.search === lastSearch || url.search === page.url.search) return;
		lastSearch = url.search;
		void goto(url, { shallow: true, replace: true });
	});

	const client = useConvexClient();
	const posts = useQuery(api.posts.queries.listUserPosts);

	let creating = $state(false);
	async function handleNewPost() {
		if (creating) return;
		creating = true;
		try {
			const newId = await client.mutation(api.posts.mutations.createDraft, {});
			// The $effect above mirrors selectedPostId into the URL; a second
			// non-shallow goto here would race it and reload the page.
			selectedPostId = newId;
		} finally {
			creating = false;
		}
	}
</script>

<svelte:head
	><title>{selectedPostId ? 'Editing...' : 'Post Editor'} — Feavel's Hub</title></svelte:head
>

<section class="hero">
	<h1 class="hero-heading">Post editor</h1>
	<p class="hero-desc">Create and manage your posts</p>
	<div class="hero-rule" aria-hidden="true"></div>
</section>

<section class="toolbar">
	<button class="btn-new" onclick={handleNewPost} disabled={creating}>
		{creating ? 'Creating...' : 'New post'}
	</button>
</section>

<section class="post-list">
	{#if posts.isLoading}
		<div class="loading">
			{#each Array(4) as _, i (i)}<Skeleton class="loading-skeleton" />{/each}
		</div>
	{:else if !posts.data?.length}
		<Empty.Root>
			<Empty.Media variant="icon"><FileEdit size={16} /></Empty.Media>
			<Empty.Header>
				<Empty.Title>No posts yet</Empty.Title>
				<Empty.Description>Create your first post to get started</Empty.Description>
			</Empty.Header>
		</Empty.Root>
	{:else}
		{#each posts.data as post, i (post._id)}
			<PostEditorSlab
				{post}
				index={i}
				isOpen={post._id === selectedPostId}
				onselect={(id: Id<'posts'> | null) => (selectedPostId = id)}
			/>
		{/each}
	{/if}
</section>

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

	.toolbar {
		padding: 0 0 1rem;
	}
	.btn-new {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 2.25rem;
		padding: 0 1.25rem;
		font-size: 0.625rem;
		font-weight: 400;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--muted);
		background: var(--foreground);
		border: none;
		cursor: pointer;
		transition: opacity 0.15s;
	}
	.btn-new:hover {
		opacity: 0.9;
	}
	.btn-new:disabled {
		opacity: 0.3;
		cursor: not-allowed;
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

	@media (max-width: 640px) {
		.hero {
			padding: 3rem 0 1.5rem;
		}
		.hero-heading {
			font-size: 1.35rem;
		}
	}
</style>
