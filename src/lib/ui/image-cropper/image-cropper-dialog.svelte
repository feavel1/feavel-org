<script lang="ts">
	import type { Snippet } from 'svelte';
	import { getImageCropper } from './image-cropper.svelte.js';

	/** STUB — no shadcn equivalent. */
	let { children }: { children?: Snippet } = $props();
	const state = getImageCropper();
</script>

{#if state.open}
	<div data-image-cropper-dialog>
		{@render children?.()}
	</div>
{/if}
