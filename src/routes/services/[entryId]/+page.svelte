<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { portfolioEntries } from '#lib/services/data';
	import { EdraEditor } from '#lib/edra/shadcn/index.js';
	import { Skeleton } from '#lib/ui/skeleton';
	import { useQuery } from 'convex-svelte';
	import { api } from '#convex/_generated/api';
	import type { Id } from '#convex/_generated/dataModel';

	const entry = $derived(portfolioEntries.find((e) => e.id === page.params.entryId));
	const post = useQuery(api.posts.queries.getPost, () =>
		entry?.postId ? { postId: entry.postId as Id<'posts'> } : 'skip'
	);

	// The catalogue number is positional, so it has to be found, not stored.
	const index = $derived(portfolioEntries.findIndex((e) => e.id === page.params.entryId));

	// Category is a free-form string on the record. Show it as-is; there is no
	// fixed taxonomy to map hieroglyphs onto any more.
	const category = $derived(entry?.category ?? '');

	// resolve() only yields a route; the hash is appended, which the eslint rule
	// cannot see through, so each template literal is annotated at its use site.
	const backHref = `${resolve('/services')}#portfolio`;
	const contactHref = `${resolve('/services')}#contact`;
</script>

<svelte:head><title>{entry ? `${entry.title} — Feavel` : 'Not found — Feavel'}</title></svelte:head>

{#if entry}
	<article class="work">
		<header class="work-head">
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- resolved route + hash -->
			<a href={backHref} class="work-back">
				<span aria-hidden="true">←</span> All work
			</a>

			<div class="work-meta">
				<span class="work-num">{String(index + 1).padStart(2, '0')}</span>
				{#if category}
					<span class="work-cat">{category}</span>
				{/if}
			</div>

			<h1 class="work-title">{entry.title}</h1>
			<p class="work-tagline">{entry.tagline}</p>
		</header>

		<div class="work-rule" aria-hidden="true"></div>

		<div class="work-body">
			{#if post.isLoading}
				<div class="work-skeletons">
					<Skeleton class="h-3 w-2/3" />
					<Skeleton class="h-3 w-full" />
					<Skeleton class="h-3 w-11/12" />
					<Skeleton class="h-3 w-9/12" />
				</div>
			{:else if post.data?.post?.content}
				<div class="work-content">
					<EdraEditor content={post.data.post.content} editable={false} />
				</div>
			{:else}
				<!-- Empty is a state, not an error: the catalogue entry exists but its
				     write-up does not. Say so plainly and keep the way forward open. -->
				<div class="work-empty">
					<p class="work-empty-line">The write-up for this one isn't published yet.</p>
					<p class="work-empty-sub">{entry.description}</p>
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
					<a href={contactHref} class="work-cta">Ask me about it →</a>
				</div>
			{/if}
		</div>

		<footer class="work-foot">
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
			<a href={contactHref} class="work-cta">Start a project like this →</a>
		</footer>
	</article>
{:else}
	<section class="work-missing">
		<p class="work-meta"><span class="work-num">00</span></p>
		<h1 class="work-title">That work doesn't exist.</h1>
		<p class="work-tagline">
			The link is stale or the piece was renamed. Everything still in the catalogue is listed below.
		</p>
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
		<a href={backHref} class="work-cta">See all work →</a>
	</section>
{/if}

<style>
	/* Same world as the shell: sharp corners, hairline rules, no shadows, serif
	   headings at Inter body weight. The old page carried a stained-glass colour
	   bar, a fixed grain overlay, and a 900-weight title — none of that is
	   part of this system. */

	.work {
		padding: 3.5rem 0 4rem;
	}

	/* ── Head ── */
	.work-head {
		display: flex;
		flex-direction: column;
	}
	.work-back {
		align-self: flex-start;
		font-size: 0.6875rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--muted-foreground);
		text-decoration: none;
		transition: color 0.2s;
	}
	.work-back:hover {
		color: var(--foreground);
	}
	.work-back span {
		display: inline-block;
		transition: transform 0.2s;
	}
	.work-back:hover span {
		transform: translateX(-2px);
	}

	.work-meta {
		display: flex;
		align-items: baseline;
		gap: 0.625rem;
		margin: 2.5rem 0 0.875rem;
	}
	.work-num {
		font-size: 0.5625rem;
		letter-spacing: 0.08em;
		color: var(--muted-foreground);
	}
	.work-cat {
		font-size: 0.5625rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--muted-foreground);
	}

	.work-title {
		font-family: var(--font-heading);
		font-size: clamp(1.5rem, 4vw, 2rem);
		font-weight: 400;
		letter-spacing: -0.02em;
		line-height: 1.2;
		text-wrap: balance;
		margin: 0;
		color: var(--foreground);
	}
	.work-tagline {
		font-size: 0.8125rem;
		line-height: 1.6;
		color: var(--muted-foreground);
		max-width: 34rem;
		margin: 0.75rem 0 0;
	}

	.work-rule {
		height: 1px;
		background: var(--border);
		margin: 2.5rem 0 2.5rem;
	}

	/* ── Body ── */
	.work-body {
		min-height: 8rem;
	}
	.work-skeletons {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.work-content {
		max-width: 68ch;
	}

	.work-empty {
		max-width: 34rem;
	}
	.work-empty-line {
		font-size: 0.8125rem;
		line-height: 1.6;
		color: var(--muted-foreground);
		margin: 0;
	}
	.work-empty-sub {
		font-size: 0.75rem;
		line-height: 1.6;
		color: var(--muted-foreground);
		margin: 0.5rem 0 1.25rem;
	}

	/* ── Foot ── */
	.work-foot {
		margin-top: 4rem;
		padding-top: 2rem;
		border-top: 1px solid var(--border);
	}

	.work-cta {
		display: inline-block;
		font-size: 0.625rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		text-decoration: none;
		color: var(--foreground);
		border-bottom: 1px solid var(--border);
		padding-bottom: 0.125rem;
		transition: border-color 0.2s;
	}
	.work-cta:hover {
		border-color: var(--foreground);
	}
	.work-cta:focus-visible,
	.work-back:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 3px;
	}

	.work-missing {
		padding: 5rem 0;
	}

	@media (prefers-reduced-motion: reduce) {
		.work-back,
		.work-back span,
		.work-cta {
			transition: none;
		}
		.work-back:hover span {
			transform: none;
		}
	}
</style>
