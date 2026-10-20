<script lang="ts">
	import type { Snippet } from 'svelte';

	/** STUB — replace with shadcn-svelte. */
	let { children, ...rest }: { children?: Snippet; [key: string]: unknown } = $props();
</script>

<h2 {...rest}>
	{@render children?.()}
</h2>
