<script lang="ts">
	import type { Snippet } from 'svelte';

	/** STUB — replace with shadcn-svelte `avatar`. */
	let {
		children,
		onStatusChange,
		...rest
	}: {
		children?: Snippet;
		onStatusChange?: (e: { status: 'loading' | 'loaded' | 'error' }) => void;
		[key: string]: unknown;
	} = $props();

	$effect(() => {
		onStatusChange?.({ status: 'loaded' });
	});
</script>

<div {...rest} data-avatar-root>
	{@render children?.()}
</div>
