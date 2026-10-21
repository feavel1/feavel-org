<script lang="ts">
	import type { NodeViewProps } from '@tiptap/core';
	import { NodeViewWrapper } from '../../tiptap/index.js';
	import { play, pause, currentTrack, isPlaying } from '#lib/player/player.svelte.js';
	import CheckIcon from '@lucide/svelte/icons/check';
	import MusicIcon from '@lucide/svelte/icons/music';
	import PauseIcon from '@lucide/svelte/icons/pause';
	import PlayIcon from '@lucide/svelte/icons/play';

	const { node, editor, updateAttributes }: NodeViewProps = $props();

	const src = $derived(node.attrs.src as string);
	const title = $derived(node.attrs.title as string | null);
	const artist = $derived(node.attrs.artist as string | null);

	const displayTitle = $derived(
		title ||
			src
				?.split('/')
				.pop()
				?.replace(/\.[^.]+$/, '') ||
			'Untitled'
	);
	const displayArtist = $derived(artist || '');

	function handlePlay() {
		if ($isPlaying && $currentTrack?.src === src) {
			pause();
		} else {
			play({ src, title: displayTitle, artist: displayArtist });
		}
	}
</script>

<NodeViewWrapper
	as="div"
	class="audio-block my-4 flex items-center gap-3 border border-border bg-card/40 px-4 py-3"
>
	<!-- Icon -->
	<div class="shrink-0 text-muted-foreground">
		{#if $currentTrack?.src === src}
			<CheckIcon class="size-4 text-foreground" />
		{:else}
			<MusicIcon class="size-4" />
		{/if}
	</div>

	<!-- Metadata -->
	<div class="min-w-0 flex-1">
		{#if editor.isEditable}
			<input
				value={node.attrs.title ?? ''}
				type="text"
				placeholder="Track title"
				aria-label="Track title"
				class="audio-block-input block w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/40"
				onchange={(e) => updateAttributes({ title: e.currentTarget.value || null })}
			/>
			<input
				value={node.attrs.artist ?? ''}
				type="text"
				placeholder="Artist"
				aria-label="Artist"
				class="audio-block-input mt-0.5 block w-full bg-transparent text-xs text-muted-foreground outline-none placeholder:text-muted-foreground/30"
				onchange={(e) => updateAttributes({ artist: e.currentTarget.value || null })}
			/>
		{:else}
			<p class="truncate text-sm text-foreground">{displayTitle}</p>
			{#if displayArtist}
				<p class="truncate text-xs text-muted-foreground">{displayArtist}</p>
			{/if}
		{/if}
	</div>

	<!-- State label -->
	{#if $currentTrack?.src === src}
		<span class="hidden text-[0.625rem] tracking-wider text-muted-foreground uppercase sm:inline">
			{$isPlaying ? 'Now playing ↓' : 'Loaded ↓'}
		</span>
	{/if}

	<!-- Play/pause -->
	<button
		type="button"
		class="audio-block-btn shrink-0"
		onclick={handlePlay}
		aria-label={$isPlaying && $currentTrack?.src === src ? 'Pause' : 'Play'}
	>
		{#if $isPlaying && $currentTrack?.src === src}
			<PauseIcon class="size-4" />
		{:else}
			<PlayIcon class="size-4" />
		{/if}
	</button>
</NodeViewWrapper>

<style>
	/* ponytail: :global needed — .audio-block is on NodeViewWrapper (child component) */
	:global(.audio-block) {
		transition: border-color 0.2s;
	}
	:global(.audio-block:has(.audio-block-btn:hover)) {
		border-color: var(--muted-foreground);
	}

	.audio-block-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		flex-shrink: 0;
		color: var(--foreground);
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		opacity: 0.5;
		transition: opacity 0.2s;
	}
	.audio-block-btn:hover {
		opacity: 0.8;
	}

	/* WCAG: the original placeholder tokens (/40, /30) fall below 4.5:1, and
	   --muted-foreground is 3.99:1 on dark. Lift both to a readable ink. */
	.audio-block-input::placeholder {
		color: color-mix(in oklch, var(--foreground) 18%, var(--muted-foreground));
		opacity: 1;
	}
</style>
