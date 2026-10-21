<script lang="ts">
	// Primitives
	import * as Tabs from '../../ui/tabs';
	import * as Dialog from '../../ui/dialog';
	import * as Drawer from '../../ui/drawer';
	import { Button } from '../../ui/button';
	// Icons
	import PlusIcon from '@lucide/svelte/icons/plus';
	// Components
	import Members from './Members.svelte';
	import Invitations from './Invitations.svelte';
	import InviteMembers from './InviteMembers.svelte';

	// API
	import { useQuery } from 'convex-svelte';
	import { useRoles } from '../api/roles.svelte';
	import { useAuth } from '@mmailaender/convex-better-auth-svelte/svelte';
	import { getAuthContext } from '../../auth/context.svelte';
	const { api } = getAuthContext();

	// Types
	import type { GetActiveOrganizationType, ListInvitationsType, Role } from '../../auth/types';

	// Props
	let {
		initialData
	}: {
		initialData?: {
			activeOrganization?: GetActiveOrganizationType;
			invitationList?: ListInvitationsType;
			role?: Role;
		};
	} = $props();

	// Auth
	const auth = useAuth();
	const roles = useRoles({}, () => ({
		initialData: initialData?.role
	}));
	const isOwnerOrAdmin = $derived(roles.hasOwnerOrAdminRole);

	// Queries
	const activeOrganizationResponse = useQuery(
		api.organizations.queries.getActiveOrganization,
		() => (auth.isAuthenticated ? {} : 'skip'),
		() => ({
			initialData: initialData?.activeOrganization
		})
	);
	const invitationListResponse = useQuery(
		api.organizations.invitations.queries.listInvitations,
		() => (auth.isAuthenticated ? {} : 'skip'),
		() => ({
			initialData: initialData?.invitationList
		})
	);
	// Derived data
	const activeOrganization = $derived(activeOrganizationResponse?.data);
	const members = $derived(activeOrganization?.members);
	const invitationList = $derived(invitationListResponse?.data);

	// State
	let inviteMembersDrawerOpen = $state(false);
	let inviteMembersDialogOpen = $state(false);

	// Handlers
	function handleInviteMembersSuccess() {
		inviteMembersDialogOpen = false;
		inviteMembersDrawerOpen = false;
	}
</script>

<Tabs.Root value="members">
	<div class="flex w-full flex-row justify-between border-b border-border pb-6 align-middle">
		<Tabs.List class="flex-1 md:flex-initial">
			<Tabs.Trigger value="members" class="flex-1 gap-2 md:flex-initial">
				Members
				<span
					class="inline-flex size-6 items-center justify-center rounded-full bg-secondary text-xs font-medium text-secondary-foreground"
				>
					{members && `${members.length}`}
				</span>
			</Tabs.Trigger>
			{#if isOwnerOrAdmin}
				<Tabs.Trigger value="invitations" class="flex-1 gap-2 md:flex-initial">
					Invitations
					<span
						class="inline-flex size-6 items-center justify-center rounded-full bg-secondary text-xs font-medium text-secondary-foreground"
					>
						{invitationList && `${invitationList.filter((i) => i.status === 'pending').length}`}
					</span>
				</Tabs.Trigger>
			{/if}
		</Tabs.List>
		{#if isOwnerOrAdmin}
			<Button
				type="button"
				class="hidden h-10 items-center gap-2 text-sm md:flex"
				onclick={() => (inviteMembersDialogOpen = true)}
			>
				<PlusIcon class="size-5" />
				<span>Invite members</span>
			</Button>
			<Dialog.Root bind:open={inviteMembersDialogOpen}>
				<Dialog.Content class="max-w-100">
					<Dialog.Header>
						<Dialog.Title>Invite new members</Dialog.Title>
					</Dialog.Header>
					<InviteMembers onSuccess={handleInviteMembersSuccess} {initialData} />
				</Dialog.Content>
			</Dialog.Root>
			<Drawer.Root bind:open={inviteMembersDrawerOpen}>
				<Drawer.Trigger>
					{#snippet child({ props })}
						<Button {...props} class="absolute right-4 bottom-4 z-10 h-10 text-sm md:hidden">
							<PlusIcon class="size-5" /> Invite members
						</Button>
					{/snippet}
				</Drawer.Trigger>
				<Drawer.Content>
					<Drawer.Header>
						<Drawer.Title>Invite new members</Drawer.Title>
					</Drawer.Header>
					<InviteMembers onSuccess={handleInviteMembersSuccess} {initialData} />
				</Drawer.Content>
			</Drawer.Root>
		{/if}
	</div>

	<Tabs.Content value="members">
		<Members {initialData} />
	</Tabs.Content>

	{#if isOwnerOrAdmin}
		<Tabs.Content value="invitations">
			<Invitations {initialData} />
		</Tabs.Content>
	{/if}
</Tabs.Root>
