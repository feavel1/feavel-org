<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { getPassword } from './password.svelte.js';

	/** STUB — password input wired to PasswordState. */
	let { value = $bindable(''), ...rest }: HTMLInputAttributes & { value?: string } = $props();
	const state = getPassword();

	$effect(() => {
		state.value = value;
	});

	$effect(() => {
		state.inputRef?.setCustomValidity(state.tooWeak ? 'Password is too weak' : '');
	});
</script>

<input
	type={state.hidden ? 'password' : 'text'}
	bind:this={state.inputRef}
	bind:value
	onfocus={() => (state.submitted = false)}
	{...rest}
/>
