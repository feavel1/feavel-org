<script lang="ts">
	import type { NodeViewProps } from '@tiptap/core';
	import MediaExtended from './MediaExtended.svelte';

	const { ...rest }: NodeViewProps = $props();

	let mediaRef = $state<HTMLElement>();

	// ponytail: remember *which* src finished instead of a boolean, so a src swap
	// needs no reset and therefore no $effect. The memo is derived from src, not
	// synchronised into state.
	let loadedSrc = $state<string>();
	let failedSrc = $state<string>();

	const src = $derived(rest.node.attrs.src);
	const ar = $derived(rest.node.attrs.ar);
	const tint = $derived(rest.node.attrs.tint);
	const status = $derived(failedSrc === src ? 'failed' : loadedSrc === src ? 'loaded' : 'loading');

	async function handleLoad(e: Event) {
		const img = e.currentTarget as HTMLImageElement;
		await img.decode().catch(() => {}); // paint a finished frame, no jank
		loadedSrc = src;
	}
</script>

<MediaExtended bind:mediaRef {...rest}>
	{@const node = rest.node}
	<img
		bind:this={mediaRef}
		src={node.attrs.src}
		alt={node.attrs.alt}
		title={node.attrs.title}
		loading="lazy"
		decoding="async"
		class="m-0 object-cover"
		class:animate-pulse={status === 'loading'}
		class:min-h-40={status === 'loading' && !ar}
		style:aspect-ratio={ar}
		style:background-color={status === 'loading' ? tint : null}
		onload={handleLoad}
		onerror={() => (failedSrc = src)}
	/>
</MediaExtended>
