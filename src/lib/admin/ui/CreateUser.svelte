<script lang="ts">
	// Primitives
	import * as Dialog from '#lib/ui/dialog/index.js';
	import * as Password from '#lib/ui/password/index.js';
	import { Badge } from '#lib/ui/badge/index.js';
	import { Button, buttonVariants } from '#lib/ui/button/index.js';
	import { Input } from '#lib/ui/input/index.js';
	import { Label } from '#lib/ui/label/index.js';
	// Icons
	import PlusIcon from '@lucide/svelte/icons/plus';
	import Loader2Icon from '@lucide/svelte/icons/loader-2';
	import XIcon from '@lucide/svelte/icons/x';
	// Components
	import OrganizationSelect from '#lib/admin/ui/OrganizationSelect.svelte';
	// API
	import { useConvexClient } from 'convex-svelte';
	import { getAuthContext } from '#lib/auth/context.svelte.js';
	import { toast } from 'svelte-sonner';
	// Types
	import type { AdminOrganization, OrganizationRole } from '#lib/admin/types.js';

	const { api, authConstants } = getAuthContext();
	const client = useConvexClient();
	const organizationsEnabled = Boolean(authConstants.organizations);

	let open = $state(false);
	let name = $state('');
	let email = $state('');
	let password = $state('');
	let organization = $state<AdminOrganization | null>(null);
	let organizationRole = $state<OrganizationRole>('member');
	let submitting = $state(false);

	function reset() {
		name = '';
		email = '';
		password = '';
		organization = null;
		organizationRole = 'member';
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		submitting = true;
		try {
			await client.mutation(api.admin.mutations.createUser, {
				name: name.trim(),
				email: email.trim(),
				password,
				organizationId: organization?._id,
				organizationRole: organization ? organizationRole : undefined
			});
			toast.success(`Created ${name.trim()}`);
			open = false;
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to create user');
		} finally {
			submitting = false;
		}
	}
</script>

<Dialog.Root bind:open onOpenChange={(next) => next && reset()}>
	<Dialog.Trigger>
		{#snippet child({ props })}
			<Button {...props} class="shrink-0 gap-2" aria-label="New user">
				<PlusIcon class="size-4" aria-hidden="true" />
				<span class="hidden sm:inline">New user</span>
			</Button>
		{/snippet}
	</Dialog.Trigger>
	<Dialog.Content class="md:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Create user</Dialog.Title>
			<Dialog.Description>
				The user can sign in with this email and password right away.
			</Dialog.Description>
		</Dialog.Header>
		<form id="admin-create-user" class="flex w-full flex-col gap-3" onsubmit={handleSubmit}>
			<Label class="flex-col items-start gap-1.5">
				<span>Name</span>
				<Input type="text" bind:value={name} autocomplete="off" required />
			</Label>
			<Label class="flex-col items-start gap-1.5">
				<span>Email</span>
				<Input type="email" bind:value={email} autocomplete="off" required />
			</Label>
			<Label class="flex-col items-start gap-1.5">
				<span>Password</span>
				<Password.Root minScore={0}>
					<Password.Input bind:value={password} autocomplete="new-password" minlength={8} required>
						<Password.ToggleVisibility />
					</Password.Input>
				</Password.Root>
			</Label>
			{#if organizationsEnabled}
				<div class="mt-2 flex flex-col gap-3 border-t border-border pt-4">
					<div class="flex flex-col gap-1.5">
						<div class="flex items-center justify-between">
							<Label for="admin-create-user-organization">Add to organization</Label>
							{#if organization}
								<Button
									variant="ghost"
									size="sm"
									class="gap-1 px-2 text-xs"
									onclick={() => (organization = null)}
								>
									<XIcon class="size-3" aria-hidden="true" />
									Clear
								</Button>
							{:else}
								<Badge variant="secondary" class="text-xs">Optional</Badge>
							{/if}
						</div>
						<OrganizationSelect id="admin-create-user-organization" bind:value={organization} />
					</div>
					{#if organization}
						<Label class="flex-col items-start gap-1.5">
							<span>Role in {organization.name}</span>
							<select
								class="h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none"
								bind:value={organizationRole}
							>
								<option value="member">Member</option>
								<option value="admin">Admin</option>
							</select>
						</Label>
					{/if}
				</div>
			{/if}
		</form>
		<Dialog.Footer>
			<Dialog.Close class={buttonVariants({ variant: 'secondary' })} disabled={submitting}>
				Cancel
			</Dialog.Close>
			<Button type="submit" form="admin-create-user" disabled={submitting} aria-busy={submitting}>
				{#if submitting}
					<Loader2Icon class="size-4 animate-spin" aria-hidden="true" />
					Creating...
				{:else}
					Create user
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
