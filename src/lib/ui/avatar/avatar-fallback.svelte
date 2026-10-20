<script lang="ts">
	import type { Snippet } from 'svelte';

	/** STUB — replace with shadcn-svelte. */
	let { children, ...rest }: { children?: Snippet; [key: string]: unknown } = $props();
</script>

<span {...rest}>
	{@render children?.()}
</span>
