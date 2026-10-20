<script lang="ts">
	// Context
	import { setAuthContext } from '../context.svelte';

	// Types
	import type { AuthContext } from '../types';

	type AuthProviderProps = AuthContext & {
		/** Child content to render */
		children?: import('svelte').Snippet;
	};

	let { api, authClient, authConstants, children }: AuthProviderProps = $props();

	// Inject context for all descendant components (static config — never changes per request).
	// svelte-ignore state_referenced_locally
	setAuthContext({ api, authClient, authConstants });
</script>

{#if children}
	{@render children()}
{/if}
