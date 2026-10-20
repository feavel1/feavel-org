<script lang="ts">
	import type { Snippet } from 'svelte';
	import { getImageCropper } from './image-cropper.svelte.js';

	/** STUB — confirm the crop. */
	let { children }: { children?: Snippet } = $props();
	const state = getImageCropper();
</script>

<button type="button" data-image-cropper-crop onclick={() => state.crop()}>
	{@render children?.()}
</button>
