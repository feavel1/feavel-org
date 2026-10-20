<script lang="ts">
	import { getImageCropper } from './image-cropper.svelte.js';

	/**
	 * STUB — the real cropper UI is missing.
	 * Install a crop library (svelte-easy-crop) and call
	 * `state.pixelCrop = e.pixels` on its cropcomplete event.
	 */
	let { cropShape = 'round' }: { cropShape?: 'round' | 'rect' } = $props();
	const state = getImageCropper();
</script>

<div data-image-cropper-cropper data-shape={cropShape}>
	<img src={state.tempUrl} alt="To crop" class="max-h-64 w-full object-contain" />
	<p class="text-xs text-muted-foreground">
		Cropper UI not installed — see <code>docs/ui-migration.md</code>.
	</p>
</div>
