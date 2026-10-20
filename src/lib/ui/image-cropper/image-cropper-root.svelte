<script lang="ts">
	import type { Snippet } from 'svelte';
	import { ImageCropperState, setImageCropper } from './image-cropper.svelte.js';

	/**
	 * STUB — no shadcn equivalent. Renders children and provides cropper state.
	 * `bind:src` is written when a crop completes.
	 */
	let {
		src = $bindable(''),
		onCropped,
		onUnsupportedFile,
		accept = 'image/*',
		children
	}: {
		src?: string;
		accept?: string;
		onCropped?: (url: string) => void;
		onUnsupportedFile?: (file: File) => void;
		children?: Snippet;
	} = $props();

	setImageCropper(
		new ImageCropperState({
			src: () => src,
			accept: () => accept,
			onCropped: (url) => {
				src = url;
				onCropped?.(url);
			},
			onUnsupportedFile: (file) => onUnsupportedFile?.(file)
		})
	);
</script>

<div data-image-cropper-root>
	{@render children?.()}
</div>
