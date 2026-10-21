<script lang="ts">
	// Primitives
	import * as Dialog from '../../ui/dialog';
	import { Button, buttonVariants } from '../../ui/button';
	import { toast } from 'svelte-sonner';
	// Icons
	import Loader2Icon from '@lucide/svelte/icons/loader-2';

	// API
	import { useConvexClient } from 'convex-svelte';
	import { ConvexError } from 'convex/values';
	import { getAuthContext } from '../../auth/context.svelte';
	const { api, authClient } = getAuthContext();
	const client = useConvexClient();

	// Utils
	import { requestCloseUserProfile } from '../utils/userProfile';

	// State
	let deleteDialogOpen: boolean = $state(false);
	let isDeleting: boolean = $state(false);

	/**
	 * Handle the delete confirmation action
	 */
	async function handleConfirm(): Promise<void> {
		isDeleting = true;

		// Step 1: Delete user via Convex to have transaction safety
		try {
			await client.mutation(api.users.mutations.deleteUser, {});
		} catch (error) {
			if (error instanceof ConvexError) {
				toast.error(error.data);
			} else if (error instanceof Error) {
				toast.error(error.message);
			} else {
				toast.error('Failed to delete user');
			}
			isDeleting = false;
			return;
		}

		// Step 2: Sign out via Better Auth
		const { error: signOutError } = await authClient.signOut();
		if (signOutError) {
			toast.error(signOutError.message || `${signOutError.status} ${signOutError.statusText}`);
			isDeleting = false;
			return;
		}

		// Request closing the profile dialog (handled by UserProfileHost)
		requestCloseUserProfile();

		toast.success('User deleted successfully');
		deleteDialogOpen = false;
		isDeleting = false;
	}
</script>

<Dialog.Root bind:open={deleteDialogOpen}>
	<Dialog.Trigger
		class="h-8 justify-between gap-1 rounded-md px-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
		>Delete account</Dialog.Trigger
	>
	<Dialog.Content class="md:max-w-108">
		<Dialog.Header>
			<Dialog.Title>Delete your account</Dialog.Title>
			<Dialog.Description class="text-muted-foreground">
				Are you sure you want to delete your account? All of your data will be permanently deleted.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer class="w-full">
			<Dialog.Close class={buttonVariants({ variant: 'secondary' })} disabled={isDeleting}
				>Cancel</Dialog.Close
			>
			<Button
				type="button"
				variant="destructive"
				onclick={handleConfirm}
				disabled={isDeleting}
				aria-busy={isDeleting}
			>
				{#if isDeleting}
					<Loader2Icon class="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
					Deleting...
				{:else}
					Delete
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
