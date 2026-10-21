<script lang="ts">
	// Primitives
	import * as Dialog from '../../ui/dialog';
	import { Input } from '../../ui/input';
	import { Button } from '../../ui/button';
	import { toast } from 'svelte-sonner';
	// Icons
	import SearchIcon from '@lucide/svelte/icons/search';
	import Loader2Icon from '@lucide/svelte/icons/loader-2';

	// API
	import { useQuery } from 'convex-svelte';
	import { useRoles } from '../api/roles.svelte';
	import { useAuth } from '@mmailaender/convex-better-auth-svelte/svelte';
	import { getAuthContext } from '../../auth/context.svelte';
	const { api, authClient } = getAuthContext();

	// Types
	import type { Role, ListInvitationsType } from '../../auth/types';

	// Props
	let {
		initialData
	}: {
		initialData?: {
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
	const invitationListResponse = useQuery(
		api.organizations.invitations.queries.listInvitations,
		() => (auth.isAuthenticated ? {} : 'skip'),
		() => ({
			initialData: initialData?.invitationList
		})
	);
	const invitationList = $derived(invitationListResponse?.data);

	// State
	let selectedInvitationId: string | null = $state(null);
	let searchQuery: string = $state('');
	let isRevokeDialogOpen: boolean = $state(false);
	let isRevoking: boolean = $state(false);

	// Selected invitation for dialog text
	const selectedInvitation = $derived.by(
		() => invitationList?.find((i) => i.id === selectedInvitationId) ?? null
	);

	/**
	 * Filter invitations based on search query and only show pending invitations
	 */
	const filteredInvitations = $derived.by(() => {
		if (!invitationList) return [];

		return invitationList
			.filter((invitation) => {
				// Only show pending invitations
				if (invitation.status !== 'pending') return false;
				if (!searchQuery) return true;
				return invitation.email.toLowerCase().includes(searchQuery.toLowerCase());
			})
			.sort((a, b) => {
				// Sort by role (owner first, then admin, then member)
				const roleOrder: Record<Role, number> = {
					owner: 0,
					admin: 1,
					member: 2
				};

				// Primary sort by role
				const roleDiff = roleOrder[a.role as Role] - roleOrder[b.role as Role];
				if (roleDiff !== 0) return roleDiff;

				// Secondary sort by email
				return a.email.localeCompare(b.email);
			});
	});

	/**
	 * Handles revoking an invitation
	 */
	async function handleRevokeInvitation(): Promise<void> {
		if (!selectedInvitationId) return;

		isRevoking = true;
		try {
			const { error } = await authClient.organization.cancelInvitation({
				invitationId: selectedInvitationId
			});

			if (error?.message) {
				toast.error(error.message);
				return;
			}
			toast.success('Invitation revoked successfully');
			isRevokeDialogOpen = false;
			selectedInvitationId = null;
		} catch {
			toast.error('Failed to revoke the invitation');
		} finally {
			isRevoking = false;
		}
	}

	/**
	 * Handle search input change
	 */
	function handleSearchChange(e: Event): void {
		const target = e.target as HTMLInputElement;
		searchQuery = target.value;
	}
</script>

{#if !invitationList}
	<div>Loading invitations...</div>
{:else if filteredInvitations.length === 0 && !searchQuery}
	<div
		class="p-8 text-center text-[color-mix(in_oklch,var(--foreground)_18%,var(--muted-foreground))]"
	>
		<p>No pending invitations.</p>
	</div>
{:else}
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
					placeholder="Search invitations..."
					value={searchQuery}
					onchange={handleSearchChange}
				/>
			</div>
		</div>

		<!-- Table Section - Scrollable area -->
		<div class="min-h-0 flex-1">
			{#if filteredInvitations.length === 0 && searchQuery}
				<div
					class="p-8 text-center text-[color-mix(in_oklch,var(--foreground)_18%,var(--muted-foreground))]"
				>
					<p>No invitations match your search.</p>
				</div>
			{:else}
				<div>
					<!-- Table container with controlled height and scroll -->
					<div
						class="max-h-[calc(90vh-12rem)] overflow-y-auto pb-12 sm:max-h-[calc(80vh-12rem)] md:max-h-[calc(70vh-12rem)]"
					>
						<table class="table w-full !table-fixed">
							<thead
								class="sticky top-0 z-20 border-b border-[color-mix(in_oklch,var(--border)_70%,transparent)]"
							>
								<tr>
									<th
										class="w-64 truncate p-2 !pl-0 text-left text-xs text-[color-mix(in_oklch,var(--foreground)_18%,var(--muted-foreground))]"
									>
										User
									</th>
									<th
										class="w-32 p-2 !pl-0 text-left text-xs text-[color-mix(in_oklch,var(--foreground)_18%,var(--muted-foreground))]"
									>
										Expires
									</th>
									<th
										class="hidden w-32 p-2 text-left text-xs text-[color-mix(in_oklch,var(--foreground)_18%,var(--muted-foreground))] sm:table-cell"
									>
										Role
									</th>
									{#if isOwnerOrAdmin}
										<th class="w-20 p-2 text-right"></th>
									{/if}
								</tr>
							</thead>
							<tbody>
								{#each filteredInvitations as invitation (invitation.id)}
									<tr class="!border-t !border-[color-mix(in_oklch,var(--border)_70%,transparent)]">
										<!-- User -->
										<td class="!w-64 !max-w-64 !truncate !py-3 !pl-0">
											<span class="truncate font-medium">{invitation.email}</span>
										</td>
										<!-- Expires -->
										<td class="!w-64 !max-w-64 !truncate !py-3 !pl-0">
											<span class="truncate font-medium">
												{new Date(invitation.expiresAt).toLocaleDateString()}
											</span>
										</td>
										<!-- Role -->
										<td
											class="hidden !w-32 !text-[color-mix(in_oklch,var(--foreground)_18%,var(--muted-foreground))] sm:table-cell"
										>
											<div class="flex items-center">
												{#if invitation.role === 'owner'}
													<span class="org-pill org-pill--owner"> Owner </span>
												{:else if invitation.role === 'admin'}
													<span class="org-pill org-pill--admin"> Admin </span>
												{:else}
													<span
														class="h-6 border border-[color-mix(in_oklch,var(--foreground)_22%,transparent)] bg-[color-mix(in_oklch,var(--foreground)_8%,transparent)] px-2"
													>
														Member
													</span>
												{/if}
											</div>
										</td>
										<!-- Actions -->
										<td class="!w-20">
											<div class="flex justify-end">
												{#if isOwnerOrAdmin}
													<Button
														type="button"
														variant="secondary"
														size="sm"
														onclick={() => {
															selectedInvitationId = invitation.id;
															isRevokeDialogOpen = true;
														}}
													>
														Revoke
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
			{/if}
		</div>
	</div>

	<Dialog.Root bind:open={isRevokeDialogOpen}>
		<Dialog.Content class="md:max-w-108">
			<Dialog.Header class="flex-shrink-0">
				<Dialog.Title>Revoke invitation</Dialog.Title>
			</Dialog.Header>

			<article class="flex-shrink-0 px-6">
				<p class="opacity-60">
					Are you sure you want to revoke the invitation
					{#if selectedInvitation}
						sent to {selectedInvitation.email}?
					{:else}
						?
					{/if}
				</p>
			</article>

			<Dialog.Footer class="w-full flex-shrink-0 p-6">
				<Button
					type="button"
					variant="secondary"
					disabled={isRevoking}
					onclick={() => (isRevokeDialogOpen = false)}
				>
					Cancel
				</Button>

				<Button
					type="button"
					variant="destructive"
					onclick={handleRevokeInvitation}
					disabled={isRevoking}
					aria-busy={isRevoking}
				>
					{#if isRevoking}
						<Loader2Icon class="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
						Revoking...
					{:else}
						Confirm
					{/if}
				</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
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
