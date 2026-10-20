<script lang="ts">
	import type { Snippet } from 'svelte';
	import { getPassword } from './password.svelte.js';

	/** STUB — copy the password to the clipboard. */
	let { children }: { children?: Snippet } = $props();
	const state = getPassword();
</script>

<button type="button" data-password-copy onclick={() => navigator.clipboard.writeText(state.value)}>
	{@render children?.()}
</button>
