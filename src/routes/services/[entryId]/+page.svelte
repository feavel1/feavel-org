<script lang="ts">
	import { page } from '$app/state';
	import { portfolioEntries } from '#lib/services/data';
	import { EdraEditor } from '#lib/edra/shadcn/index.js';
	import { Skeleton } from '#lib/ui/skeleton';
	import { useQuery } from 'convex-svelte';
	import { api } from '#convex/_generated/api';
	import type { Id } from '#convex/_generated/dataModel';
	import '#lib/services/bebop.css';

	const entry = $derived(portfolioEntries.find((e) => e.id === page.params.entryId));
	const post = useQuery(api.posts.queries.getPost, () =>
		entry?.postId ? { postId: entry.postId as Id<'posts'> } : 'skip'
	);

	const disciplineBars: Record<string, string> = {
		music: 'disc-ruby',
		mixing: 'disc-ruby',
		translation: 'disc-sapphire',
		web: 'disc-emerald'
	};
</script>

{#if entry}
	{@const bar = disciplineBars[entry.category] ?? 'disc-emerald'}
	<div class="portfolio-detail">
		<div class="grain-overlay" aria-hidden="true"></div>
		<header class="portfolio-detail__head" style="background-color: var(--background)">
			<div class="portfolio-detail__bar {bar}" aria-hidden="true"></div>
			<div class="page">
				<a href="/services#portfolio" class="portfolio-detail__back">← Back to all work</a>
				<h1 class="portfolio-detail__title">{entry.title}</h1>
				<p class="portfolio-detail__tagline">{entry.tagline}</p>
			</div>
		</header>
		<div class="portfolio-detail__content page">
			{#if post.isLoading}
				<div class="flex flex-col gap-3 py-12">
					<Skeleton class="h-4 w-3/4" />
					<Skeleton class="h-4 w-full" />
					<Skeleton class="h-4 w-full" />
				</div>
			{:else if post.data?.post}
				<EdraEditor content={post.data.post.content} editable={false} />
			{:else}
				<p class="py-12 text-sm" style="color: var(--muted-foreground)">
					Work details coming soon.
				</p>
			{/if}
		</div>
	</div>
{:else}
	<div class="page py-24">
		<h1 class="text-3xl font-bold" style="color: var(--foreground)">Not found</h1>
		<p class="mt-2 text-sm" style="color: var(--muted-foreground)">That work doesn't exist.</p>
		<a
			href="/services"
			class="mt-4 inline-block text-sm font-medium underline underline-offset-4"
			style="color: var(--primary)"
		>
			View all work
		</a>
	</div>
{/if}

<style>
	.portfolio-detail__head {
		position: relative;
		padding-top: 3rem;
		padding-bottom: 2rem;
	}
	.portfolio-detail__bar {
		height: 6px;
		width: 100%;
	}
	.portfolio-detail__back {
		display: inline-block;
		font-size: 0.75rem;
		color: var(--muted-foreground);
		text-decoration: none;
		margin-bottom: 1.5rem;
		transition: color 0.15s;
	}
	.portfolio-detail__back:hover {
		color: var(--foreground);
	}
	.portfolio-detail__title {
		font-size: 2.5rem;
		font-weight: 900;
		letter-spacing: -0.03em;
		line-height: 1.1;
		color: var(--foreground);
	}
	@media (min-width: 640px) {
		.portfolio-detail__title {
			font-size: 3.5rem;
		}
	}
	.portfolio-detail__tagline {
		font-size: 0.875rem;
		color: var(--muted-foreground);
		margin-top: 0.5rem;
	}
	.portfolio-detail__content {
		padding-top: 2rem;
		padding-bottom: 6rem;
	}
</style>
