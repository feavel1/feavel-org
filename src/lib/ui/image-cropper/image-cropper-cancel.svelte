<script lang="ts">
	import type { Snippet } from 'svelte';
	import { getImageCropper } from './image-cropper.svelte.js';

	/** STUB — dismiss the crop. */
	let { children }: { children?: Snippet } = $props();
	const state = getImageCropper();
</script>

<button type="button" data-image-cropper-cancel onclick={() => state.cancel()}>
	{#if children}{@render children()}{:else}Cancel{/if}
</button>
