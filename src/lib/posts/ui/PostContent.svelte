<script lang="ts">
	import { EdraEditor } from '$lib/edra/shadcn/index.js';
	import * as Empty from '$lib/ui/empty';
	import defaultContent from '$lib/posts/default_content';
	import { MessageCircle, LoaderCircle } from '@lucide/svelte';
	import { fade } from 'svelte/transition';

	let { post }: { post: { id: string; title: string } } = $props();

	let ready = $state(false);
	let wrapperEl = $state<HTMLDivElement>();
	let contentEl = $state<HTMLDivElement>();
	let height = $state(0);

	const SKELETON = 200;

	$effect(() => {
		const t = setTimeout(() => {
			ready = true;
		}, 800);
		return () => clearTimeout(t);
	});

	$effect(() => {
		if (ready && contentEl) {
			height = contentEl.scrollHeight;
		}
	});

	const currentHeight = $derived(ready && height > 0 ? height : SKELETON);
	const done = $derived(ready && height > 0);
</script>

<div class="wrapper" style="height: {currentHeight}px" bind:this={wrapperEl}>
	<!-- loading overlay -->
	{#if !ready}
		<div class="overlay" transition:fade={{ duration: 1000 }}>
			<div class="overlay-inner">
				<Empty.Root>
					<Empty.Media variant="icon"><LoaderCircle class="spin" size={16} /></Empty.Media>
					<Empty.Header>
						<Empty.Title>Loading post...</Empty.Title>
						<Empty.Description>Fetching from the workshop.</Empty.Description>
					</Empty.Header>
				</Empty.Root>
			</div>
		</div>
	{/if}

	<!-- content underneath -->
	<div class="inner" bind:this={contentEl}>
		<div class="content" class:content--visible={done}>
			<EdraEditor content={defaultContent} editable={false} />
			<div class="rule"></div>
			<div class="comments">
				<p class="comments-label">Comments</p>
				<Empty.Root>
					<Empty.Media variant="icon"><MessageCircle size={16} /></Empty.Media>
					<Empty.Header>
						<Empty.Title>No comments yet</Empty.Title>
						<Empty.Description>Be the first to share your thoughts.</Empty.Description>
					</Empty.Header>
				</Empty.Root>
			</div>
		</div>
	</div>
</div>

<style>
	.wrapper {
		overflow: hidden;
		height: 0;
		transition: height 0.45s cubic-bezier(0.22, 1, 0.36, 1);
		position: relative;
	}

	/* overlay covers content during loading */
	.overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--card);
		z-index: 2;
		transition: opacity 0.3s ease;
	}
	.overlay-inner {
		padding: 2rem;
	}

	/* content fades in after ready */
	.content {
		padding: 0 0 2rem 2rem;
		opacity: 0;
		transition: opacity 0.35s 0.1s ease;
	}
	.content--visible {
		opacity: 1;
	}

	/* ponytail: .spin used on LoaderCircle icon via class= — needs :global */
	:global(.spin) {
		animation: rotate 1s linear infinite;
	}
	@keyframes rotate {
		to {
			transform: rotate(360deg);
		}
	}

	.rule {
		height: 1px;
		background: var(--border);
		margin: 2rem 0 1.5rem;
		width: 30%;
	}

	.comments {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.comments-label {
		font-size: 0.625rem;
		font-weight: 400;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--muted-foreground);
		opacity: 0.5;
		margin: 0;
	}
</style>
