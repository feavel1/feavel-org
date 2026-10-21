<script lang="ts">
	// Svelte
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	/** UI */
	// Primitives
	import * as Dialog from '../../ui/dialog';
	import { toast } from 'svelte-sonner';
	import * as Select from '../../ui/select';
	import { Button, buttonVariants } from '../../ui/button';
	import { Label } from '../../ui/label';
	// Icons
	import Loader2Icon from '@lucide/svelte/icons/loader-2';

	// API
	import { useQuery, useConvexClient } from 'convex-svelte';
	import { useAuth } from '@mmailaender/convex-better-auth-svelte/svelte';
	import { useRoles } from '../api/roles.svelte';
	import { ConvexError } from 'convex/values';
	import { getAuthContext } from '../../auth/context.svelte';
	const { api } = getAuthContext();
	const client = useConvexClient();

	// Types
	import type { GetActiveOrganizationType, GetActiveUserType, Role } from '../../auth/types';

	// Props
	let {
		initialData
	}: {
		initialData?: {
			activeUser?: GetActiveUserType;
			activeOrganization?: GetActiveOrganizationType;
			role?: Role;
		};
	} = $props();

	// Auth
	const auth = useAuth();
	const roles = useRoles({}, () => ({
		initialData: initialData?.role
	}));
	const isOwner = $derived(roles.hasOwnerRole);

	// Queries
	const activeUserResponse = useQuery(
		api.users.queries.getActiveUser,
		() => (auth.isAuthenticated ? {} : 'skip'),
		() => ({
			initialData: initialData?.activeUser
		})
	);
	const activeOrganizationResponse = useQuery(
		api.organizations.queries.getActiveOrganization,
		() => (auth.isAuthenticated ? {} : 'skip'),
		() => ({
			initialData: initialData?.activeOrganization
		})
	);
	const activeUser = $derived(activeUserResponse?.data);
	const activeOrganization = $derived(activeOrganizationResponse?.data);
	const members = $derived(activeOrganization?.members);

	// State
	let isOpen: boolean = $state(false);
	let isLeaving: boolean = $state(false);

	// Organization members excluding current user for successor selection
	const organizationMembers = $derived(
		members?.filter(
			(member) =>
				// Don't include the current user
				member.userId !== activeUser?._id
		) || []
	);

	// Successor select
	let selectedSuccessor = $state<string | undefined>(undefined);
	const successorItems = $derived(
		organizationMembers.map((member) => ({
			label: `${member.user.name} (${member.user.email})`,
			value: member.id
		}))
	);

	/**
	 * Validates form input before submission
	 */
	function validateForm(): boolean {
		if (isOwner && !selectedSuccessor) {
			toast.error('As the organization owner, you must select a successor before leaving.');
			return false;
		}
		return true;
	}

	/**
	 * Handles the leave organization action
	 */
	async function handleLeaveOrganization(): Promise<void> {
		if (!validateForm()) return;

		if (!activeOrganization?.id) {
			toast.error('No active organization found.');
			return;
		}

		isLeaving = true;

		try {
			await client.mutation(api.organizations.members.mutations.leaveOrganization, {
				// Only send successorMemberId if the user is an owner and a successor is selected
				...(isOwner && selectedSuccessor ? { successorMemberId: selectedSuccessor } : {})
			});

			isOpen = false;

			toast.success('Successfully left the organization.');
			// Navigate to home page after leaving
			goto(resolve('/'));
		} catch (err) {
			if (err instanceof ConvexError) {
				toast.error(err.data);
			} else {
				toast.error(
					err instanceof Error ? err.message : 'Failed to leave organization. Please try again.'
				);
			}
			console.error(err);
		} finally {
			isLeaving = false;
		}
	}
</script>

{#if activeOrganization && members && members.length > 1}
	<Dialog.Root bind:open={isOpen}>
		<Dialog.Trigger
			class={buttonVariants({ variant: 'ghost', size: 'sm' }) +
				' w-fit justify-between gap-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive'}
		>
			Leave organization
		</Dialog.Trigger>

		<Dialog.Content class="md:max-w-108">
			<Dialog.Header>
				<Dialog.Title>Leave organization</Dialog.Title>
			</Dialog.Header>

			<Dialog.Description class="flex flex-col gap-2">
				<span> If you leave organization you'll lose access to all projects and resources. </span>
				{#if isOwner}
					<span class="my-2">As the owner, you must assign a new owner before leaving.</span>
				{/if}
			</Dialog.Description>

			{#if isOwner}
				<div class="w-full space-y-2">
					<Label for="successor">New owner:</Label>
					<Select.Root type="single" items={successorItems} bind:value={selectedSuccessor}>
						<Select.Trigger id="successor" class="w-full" placeholder="Choose a successor" />
						<Select.Content>
							{#each successorItems as item (item.value)}
								<Select.Item value={item.value} label={item.label} />
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			{/if}

			<Dialog.Footer>
				<Button variant="secondary" onclick={() => (isOpen = false)} disabled={isLeaving}>
					Cancel
				</Button>
				<Button
					type="button"
					variant="destructive"
					onclick={handleLeaveOrganization}
					disabled={isLeaving || (isOwner && !selectedSuccessor)}
					aria-busy={isLeaving}
				>
					{#if isLeaving}
						<Loader2Icon class="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
						Leaving...
					{:else}
						Confirm
					{/if}
				</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
{/if}
