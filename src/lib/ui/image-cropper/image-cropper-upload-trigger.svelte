<script lang="ts">
	import type { Snippet } from 'svelte';
	import { getImageCropper } from './image-cropper.svelte.js';

	/** STUB — wraps children in a file input trigger. */
	let { children }: { children?: Snippet } = $props();
	const state = getImageCropper();

	function onchange(e: Event) {
		const file = (e.currentTarget as HTMLInputElement).files?.[0];
		if (file) state.upload(file);
	}
</script>

<label data-image-cropper-upload>
	{@render children?.()}
	<input type="file" accept={state.accept} class="sr-only" {onchange} />
</label>
