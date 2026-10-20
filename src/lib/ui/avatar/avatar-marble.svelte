<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';

	/**
	 * STUB — no shadcn equivalent.
	 * Rendered a deterministic colored avatar placeholder from a seed string.
	 */
	let { name, ...rest }: HTMLAttributes<HTMLDivElement> & { name?: string } = $props();
</script>

<div {...rest} data-avatar-marble>{name?.slice(0, 2).toUpperCase()}</div>
