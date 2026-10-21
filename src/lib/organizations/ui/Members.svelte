<script lang="ts">
	// Primitives
	import * as Dialog from '../../ui/dialog';
	import * as Drawer from '../../ui/drawer';
	import * as Avatar from '../../ui/avatar';
	import * as Select from '../../ui/select';
	import { Input } from '../../ui/input';
	import { Button } from '../../ui/button';
	import { Label } from '../../ui/label';
	import AvatarMarble from '../../ui/avatar/avatar-marble.svelte';
	import { toast } from 'svelte-sonner';
	// Icons
	import SearchIcon from '@lucide/svelte/icons/search';
	import TrashIcon from '@lucide/svelte/icons/trash';
	import PencilIcon from '@lucide/svelte/icons/pencil';

	// API
	import { useQuery } from 'convex-svelte';
	import { useRoles } from '../api/roles.svelte';
	import { useAuth } from '@mmailaender/convex-better-auth-svelte/svelte';
	import { getAuthContext } from '../../auth/context.svelte';
	const { api, authClient } = getAuthContext();

	// Types
	import type {
		Member,
		Role,
		GetActiveOrganizationType,
		GetActiveUserType
	} from '../../auth/types';

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
	const isOwnerOrAdmin = $derived(roles.hasOwnerOrAdminRole);

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
	// Derived data
	const activeUser = $derived(activeUserResponse?.data);
	const activeOrganization = $derived(activeOrganizationResponse?.data);
	const members = $derived(activeOrganization?.members);

	// State
	let selectedUserId: string | null = $state(null);
	let searchQuery: string = $state('');
	let isDialogOpen: boolean = $state(false);
	let isDrawerOpen: boolean = $state(false);
	let selectedMember: Member | null = $state(null);

	const roleOptions: { label: string; value: Role }[] = [
		{ label: 'Admin', value: 'admin' },
		{ label: 'Member', value: 'member' }
	];

	/**
	 * Filter and sort members based on search query and role
	 */
	const filteredMembers = $derived.by(() => {
		if (!members) return [];

		return members
			.filter((member) => {
				if (!searchQuery) return true;

				const memberName = member.user.name;
				const memberEmail = member.user.email;
				const query = searchQuery.toLowerCase();

				return (
					memberName.toLowerCase().includes(query) || memberEmail.toLowerCase().includes(query)
				);
			})
			.sort((a, b) => {
				// Sort by role (owner first, then admin, then member)
				const roleOrder: Record<Role, number> = {
					owner: 0,
					admin: 1,
					member: 2
				};

				// Primary sort by role
				const roleDiff = roleOrder[a.role] - roleOrder[b.role];
				if (roleDiff !== 0) return roleDiff;

				// Secondary sort by name
				return a.user.name.localeCompare(b.user.name);
			});
	});

	// Member currently targeted for removal (by selectedUserId)
	const memberToRemove: Member | null = $derived(
		selectedUserId ? (members?.find((m) => m.id === selectedUserId) ?? null) : null
	);

	/**
	 * Handles updating a member's role
	 */
	async function handleUpdateRole(memberId: string, newRole: Role): Promise<void> {
		if (newRole === 'owner') return; // Cannot set someone as owner this way

		const { error } = await authClient.organization.updateMemberRole({
			role: [newRole],
			memberId
		});
		if (error) {
			toast.error(error.statusText);
		} else {
			toast.success('Role updated successfully!');
			isDrawerOpen = false;
		}
	}

	/**
	 * Handles removing a member from the organization
	 */
	async function handleRemoveMember(): Promise<void> {
		if (!selectedUserId || !activeOrganization?.id) return;

		const { error } = await authClient.organization.removeMember({
			memberIdOrEmail: selectedUserId,
			organizationId: activeOrganization.id
		});
		if (error) {
			toast.error(error.statusText);
		} else {
			toast.success('Member removed successfully!');
			isDialogOpen = false;
			isDrawerOpen = false;
		}
	}

	/**
	 * Check if current user can edit a member
	 */
	function canEditMember(member: Member): boolean {
		if (!isOwnerOrAdmin) return false;
		if (member.id === activeUser?._id) return false;
		if (member.role === 'owner') return false;

		// If current user is admin, they can't edit other admins
		if (activeUser && members) {
			const currentUserMember = members.find((m) => m.id === activeUser._id);
			if (currentUserMember?.role === 'admin' && member.role === 'admin') {
				return false;
			}
		}

		return true;
	}

	/**
	 * Handle member card click
	 */
	function handleMemberCardClick(member: Member): void {
		if (canEditMember(member)) {
			selectedMember = member;
			isDrawerOpen = true;
		}
	}
</script>

{#if members}
	<div class="flex h-full flex-col">
		<!-- Search Section - Fixed at top -->
		<div class="flex flex-shrink-0 items-center gap-3 py-4">
			<div class="relative flex-1">
				<div class="pointer-events-none absolute inset-y-0 flex items-center">
					<SearchIcon
						class="size-4 text-[color-mix(in_oklch,var(--foreground)_18%,var(--muted-foreground))]"
					/>
				</div>
				<Input
					type="text"
					class="w-hug h-9 w-full border-0 pl-6 text-sm"
					placeholder="Search members..."
					bind:value={searchQuery}
				/>
			</div>
		</div>

		<!-- Mobile Layout -->
		<div class="block min-h-0 flex-1 sm:hidden">
			<div class="flex max-h-[calc(100vh-12rem)] flex-col gap-2 overflow-y-auto pb-24">
				{#each filteredMembers as member (member.id)}
					<div
						class={`flex items-center justify-between rounded-none border-b border-[color-mix(in_oklch,var(--border)_70%,transparent)] pr-6 pb-4 ${
							canEditMember(member)
								? 'cursor-pointer hover:bg-[color-mix(in_oklch,var(--foreground)_5%,transparent)]'
								: ''
						}`}
						onclick={() => handleMemberCardClick(member)}
						role="button"
						tabindex="0"
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								handleMemberCardClick(member);
							}
						}}
					>
						<div class="flex items-center space-x-3">
							<div class="avatar">
								<div class="size-10">
									<Avatar.Root class="size-10">
										<Avatar.Image src={member.user.image} alt={member.user.name} />
										<Avatar.Fallback>
											<AvatarMarble name={member.user.name} />
										</Avatar.Fallback>
									</Avatar.Root>
								</div>
							</div>
							<div class="flex flex-col">
								<div class="flex items-center space-x-2">
									<span class="font-medium">{member.user.name}</span>
									{#if member.role === 'owner'}
										<span class="org-pill org-pill--owner"> Owner </span>
									{/if}
									{#if member.role === 'admin'}
										<span class="org-pill org-pill--admin"> Admin </span>
									{/if}
								</div>
								<span
									class="text-sm text-[color-mix(in_oklch,var(--foreground)_18%,var(--muted-foreground))]"
									>{member.user.email}</span
								>
							</div>
						</div>
						{#if canEditMember(member)}
							<PencilIcon class="size-4 opacity-60" />
						{/if}
					</div>
				{/each}
			</div>
		</div>

		<!-- Desktop Table Layout -->
		<div class="hidden min-h-0 flex-1 sm:block">
			<div>
				<!-- Table container with controlled height and scroll -->
				<div
					class="max-h-[calc(90vh-12rem)] overflow-hidden overflow-y-auto pb-12 sm:max-h-[calc(80vh-12rem)] md:max-h-[calc(70vh-12rem)]"
				>
					<table class="table w-full !table-fixed">
						<thead class="sticky top-0 z-20">
							<tr>
								<th
									class="!w-48 p-2 !pl-3 text-left text-xs font-semibold text-[color-mix(in_oklch,var(--foreground)_18%,var(--muted-foreground))]"
									>Name</th
								>
								<th
									class="hidden p-2 text-left text-xs text-[color-mix(in_oklch,var(--foreground)_18%,var(--muted-foreground))] sm:flex"
									>Email</th
								>
								<th
									class="!w-32 p-2 text-left text-xs text-[color-mix(in_oklch,var(--foreground)_18%,var(--muted-foreground))]"
									>Role</th
								>
								{#if isOwnerOrAdmin}
									<th class="!w-16 p-2 text-right"></th>
								{/if}
							</tr>
						</thead>
						<tbody>
							{#each filteredMembers as member (member.id)}
								<tr class="!border-t !border-[color-mix(in_oklch,var(--border)_70%,transparent)]">
									<!-- Member Name -->
									<td class="!w-48 !max-w-48 !truncate !py-3 !pl-3">
										<div class="flex items-center space-x-2">
											<div class="avatar">
												<div class="size-8 sm:size-5">
													<Avatar.Root class="size-8 sm:size-5">
														<Avatar.Image src={member.user.image} alt={member.user.name} />
														<Avatar.Fallback>
															<AvatarMarble name={member.user.name} />
														</Avatar.Fallback>
													</Avatar.Root>
												</div>
											</div>

											<div class="flex flex-col truncate">
												<span class="truncate text-sm">{member.user.name}</span>
												<!-- Email visible only on mobile (hidden on sm and above) -->
												<span
													class="truncate text-xs text-[color-mix(in_oklch,var(--foreground)_18%,var(--muted-foreground))] sm:hidden"
												>
													{member.user.email}
												</span>
											</div>
										</div>
									</td>
									<!-- Member Email -->
									<td
										class="hidden !h-fit !w-full !truncate !text-[color-mix(in_oklch,var(--foreground)_18%,var(--muted-foreground))] sm:table-cell"
									>
										{member.user.email}
									</td>
									<!-- Member Role -->
									<td class="!w-32">
										<div class="flex items-center">
											{#if isOwnerOrAdmin && member.id !== activeUser?._id && member.role !== 'owner'}
												<Select.Root
													type="single"
													value={member.role}
													onValueChange={(value: string) =>
														handleUpdateRole(member.id, value as Role)}
												>
													<Select.Trigger class="w-full text-sm">
														<Select.Value />
													</Select.Trigger>
													<Select.Content>
														{#each roleOptions as option (option.value)}
															<Select.Item value={option.value} label={option.label}>
																{option.label}
															</Select.Item>
														{/each}
													</Select.Content>
												</Select.Root>
											{:else if member.role === 'owner'}
												<span class="org-pill org-pill--owner"> Owner </span>
											{:else if member.role === 'admin'}
												<span class="org-pill org-pill--admin"> Admin </span>
											{:else}
												<span
													class="h-7 border border-[color-mix(in_oklch,var(--foreground)_22%,transparent)] bg-[color-mix(in_oklch,var(--foreground)_8%,transparent)] px-2"
												>
													Member
												</span>
											{/if}
										</div>
									</td>
									<!-- Member Actions -->
									<td class="!w-16">
										<div class="flex justify-end space-x-2">
											{#if isOwnerOrAdmin && member.id !== activeUser?._id && member.role !== 'owner'}
												<Button
													type="button"
													variant="ghost"
													size="icon"
													aria-label={`Remove ${member.user.name}`}
													class="hover:bg-destructive/10 hover:text-destructive"
													onclick={() => {
														selectedUserId = member.id;
														isDialogOpen = true;
													}}
												>
													<TrashIcon class="size-4 opacity-70" />
												</Button>
											{/if}
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>

		<!-- Shared Remove Member Dialog -->
		<Dialog.Root bind:open={isDialogOpen}>
			<Dialog.Content class="z-[60] md:max-w-108">
				<Dialog.Header class="flex-shrink-0">
					<Dialog.Title>Remove member</Dialog.Title>
				</Dialog.Header>
				<Dialog.Description>
					Are you sure you want to remove the member {memberToRemove
						? memberToRemove.user.name
						: ''}?
				</Dialog.Description>

				<Dialog.Footer class="flex-shrink-0">
					<Button type="button" variant="secondary" onclick={() => (isDialogOpen = false)}>
						Cancel
					</Button>
					<Button type="button" variant="destructive" onclick={handleRemoveMember}>Confirm</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog.Root>

		<!-- Mobile Drawer -->
		<Drawer.Root bind:open={isDrawerOpen}>
			<Drawer.Content>
				<Drawer.Header>
					<Drawer.Title>Edit Member</Drawer.Title>
				</Drawer.Header>
				<div class="">
					{#if selectedMember}
						<!-- Member Info -->
						<div class="flex items-center gap-3 pt-1 pb-8">
							<div class="avatar">
								<div class="size-12">
									<Avatar.Root class="size-12">
										<Avatar.Image src={selectedMember.user.image} alt={selectedMember.user.name} />
										<Avatar.Fallback>
											<AvatarMarble name={selectedMember.user.name} />
										</Avatar.Fallback>
									</Avatar.Root>
								</div>
							</div>
							<div class="flex flex-col">
								<span>{selectedMember.user.name}</span>
								<p
									class="text-sm text-[color-mix(in_oklch,var(--foreground)_18%,var(--muted-foreground))]"
								>
									{selectedMember.user.email}
								</p>
							</div>
						</div>

						<!-- Actions -->
						<div class="flex flex-col gap-3">
							<!-- Role Select -->
							<div class="flex flex-1 flex-col gap-2">
								<Label for="member-role">Role</Label>
								<Select.Root
									type="single"
									value={selectedMember.role}
									onValueChange={(value: string) =>
										handleUpdateRole(selectedMember!.id, value as Role)}
								>
									<Select.Trigger id="member-role" class="w-full">
										<Select.Value />
									</Select.Trigger>
									<Select.Content>
										{#each roleOptions as option (option.value)}
											<Select.Item value={option.value} label={option.label}>
												{option.label}
											</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							</div>

							<!-- Remove Button -->
							<div class="flex flex-col justify-end">
								<Button
									type="button"
									variant="destructive"
									onclick={() => {
										selectedUserId = selectedMember!.id;
										isDrawerOpen = false;
										isDialogOpen = true;
									}}
								>
									<TrashIcon class="size-4" /> Remove
								</Button>
							</div>
						</div>
					{:else}
						<div
							class="p-4 text-center text-[color-mix(in_oklch,var(--foreground)_18%,var(--muted-foreground))]"
						>
							No member selected
						</div>
					{/if}
				</div></Drawer.Content
			>
		</Drawer.Root>
	</div>
{:else if !activeOrganization || !activeUser}
	<div>Failed to load members</div>
{:else}
	<div>Loading members...</div>
{/if}

<style>
	/* Role pills — micro-caps, hairline, zero radius (Weathered Wall system). */
	.org-pill {
		display: inline-flex;
		align-items: center;
		height: 1.125rem;
		padding: 0 0.3125rem;
		border: 1px solid color-mix(in oklch, var(--foreground) 22%, transparent);
		border-radius: 0;
		font-size: 0.5rem;
		font-weight: 400;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		line-height: 1;
		white-space: nowrap;
		color: var(--foreground);
	}
	.org-pill--owner {
		background: var(--foreground);
		border-color: var(--foreground);
		color: var(--background);
	}
	.org-pill--admin {
		background: transparent;
		color: color-mix(in oklch, var(--foreground) 18%, var(--muted-foreground));
	}
</style>
