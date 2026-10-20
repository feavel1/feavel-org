<script lang="ts">
	import { getPassword } from './password.svelte.js';

	/** STUB — shows the validation message after a submit attempt. */
	const state = getPassword();
</script>

{#if state.errorMessage}
	<p data-password-error class="text-xs text-destructive">{state.errorMessage}</p>
{/if}
