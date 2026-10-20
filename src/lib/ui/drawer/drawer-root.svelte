<script lang="ts">
	import type { Snippet } from 'svelte';

	/** STUB — replace with shadcn-svelte `drawer`. */
	let {
		children,
		open = $bindable(false),
		onOpenChange,
		...rest
	}: {
		children?: Snippet;
		open?: boolean;
		onOpenChange?: (e: { open: boolean }) => void;
		[key: string]: unknown;
	} = $props();

	$effect(() => {
		onOpenChange?.({ open });
	});
</script>

<div {...rest} data-drawer-root data-open={open}>
	{#if open}
		{@render children?.()}
	{/if}
</div>
