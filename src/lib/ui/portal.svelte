<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * STUB — replaces Ark UI's `Portal`.
	 * shadcn-svelte dialogs/popovers portal internally; this just renders children.
	 */
	let { children }: { children?: Snippet } = $props();
</script>

{@render children?.()}
