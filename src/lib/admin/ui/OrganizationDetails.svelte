<script lang="ts">
	// Svelte
	import { untrack } from 'svelte';
	// Primitives
	import * as Avatar from '#lib/ui/avatar/index.js';
	import AvatarMarble from '#lib/ui/avatar/avatar-marble.svelte';
	import * as Dialog from '#lib/ui/dialog/index.js';
	import * as ImageCropper from '#lib/ui/image-cropper/index.js';
	import { getFileFromUrl } from '#lib/ui/image-cropper/index.js';
	import * as Menu from '#lib/ui/dropdown-menu/index.js';
	import * as Select from '#lib/ui/select/index.js';
	import { CopyButton } from '#lib/ui/copy-button/index.js';
	import { Badge } from '#lib/ui/badge/index.js';
	import { Button, buttonVariants } from '#lib/ui/button/index.js';
	import { Input } from '#lib/ui/input/index.js';
	import { Label } from '#lib/ui/label/index.js';
	// Icons
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import Building2Icon from '@lucide/svelte/icons/building-2';
	import CircleUserIcon from '@lucide/svelte/icons/circle-user';
	import CrownIcon from '@lucide/svelte/icons/crown';
	import EllipsisVerticalIcon from '@lucide/svelte/icons/ellipsis-vertical';
	import Loader2Icon from '@lucide/svelte/icons/loader-2';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import UserMinusIcon from '@lucide/svelte/icons/user-minus';
	// Components
	import OrganizationActionsMenu from '#lib/admin/ui/OrganizationActionsMenu.svelte';
	import UserSelect from '#lib/admin/ui/UserSelect.svelte';
	// API
	import { useQuery, useConvexClient } from 'convex-svelte';
	import type { Id } from '#convex/_generated/dataModel.js';
	import { useAuth } from '@mmailaender/convex-better-auth-svelte/svelte';
	import { getAuthContext } from '#lib/auth/context.svelte.js';
	import { toast } from 'svelte-sonner';
	// Utils
	import { optimizeImage } from '#lib/utils/optimizeImage.js';
	// Types
	import type {
		AdminMember,
		AdminUser,
		OrganizationRole,
		PreviousOwner
	} from '#lib/admin/types.js';

	let {
		organizationId,
		onBack,
		onViewProfile
	}: {
		organizationId: string;
		/** Returns to the organizations table */
		onBack: () => void;
		/** Opens the profile of a user */
		onViewProfile: (userId: string) => void;
	} = $props();

	const { api } = getAuthContext();
	const client = useConvexClient();
	const auth = useAuth();
	const formId = $props.id();

	const roleOptions: { label: string; value: OrganizationRole }[] = [
		{ label: 'Member', value: 'member' },
		{ label: 'Admin', value: 'admin' }
	];

	const activeUserResponse = useQuery(api.users.queries.getActiveUser, () =>
		auth.isAuthenticated ? {} : 'skip'
	);
	const activeUserId = $derived(activeUserResponse?.data?._id);
	const detailsQuery = useQuery(api.admin.queries.getOrganizationWithMembers, () => ({
		organizationId
	}));
	const details = $derived(detailsQuery.data);
	const organization = $derived(details?.organization ?? null);
	const members = $derived(details?.members ?? []);

	/** A member's roles, which Better Auth stores comma-separated. */
	function rolesOf(member: AdminMember): string[] {
		return member.role.split(',').map((role) => role.trim());
	}

	function isOwner(member: AdminMember): boolean {
		return rolesOf(member).includes('owner');
	}

	/** The role the role select shows: a member with several roles shows the highest. */
	function roleOf(member: AdminMember): OrganizationRole {
		return rolesOf(member).includes('admin') ? 'admin' : 'member';
	}

	/**
	 * Whether the admin can't change this membership: other admins have to lose their admin role
	 * first, like on their profile (see `assertCanManageUser`). The membership of a deleted account
	 * can only be removed.
	 */
	function isLocked(member: AdminMember): boolean {
		return Boolean(member.user?.isAppAdmin && member.user._id !== activeUserId);
	}

	const owners = $derived(members.filter(isOwner));
	// Ownership changes the previous owner's membership too, so they mustn't be locked
	const canTransfer = $derived(!owners.some(isLocked));
	const successors = $derived(
		members.filter((member) => member.user && !isOwner(member) && !isLocked(member))
	);
	const hasLockedMembers = $derived(members.some(isLocked));

	// Profile form. Fields the admin hasn't edited follow the organization as it changes elsewhere
	let name = $state('');
	let slug = $state('');
	let saving = $state(false);
	let loaded: { id: string; name: string; slug: string } | null = null;
	$effect(() => {
		if (!organization) return;
		const next = { id: organization._id, name: organization.name, slug: organization.slug };
		untrack(() => {
			const otherOrganization = loaded?.id !== next.id;
			if (otherOrganization || name === loaded?.name) name = next.name;
			if (otherOrganization || slug === loaded?.slug) slug = next.slug;
			loaded = next;
		});
	});
	const isDirty = $derived(
		Boolean(organization) &&
			(name.trim() !== organization?.name || slug.trim() !== organization?.slug)
	);

	// Logo
	let cropSrc = $state('');
	let logoPreview = $state<string | null>(null);
	let logoBusy = $state(false);

	// Dialogs
	let transferOpen = $state(false);
	let successorId = $state('');
	let previousOwner = $state<PreviousOwner>('admin');
	let transferring = $state(false);

	let addOpen = $state(false);
	let addUser = $state<AdminUser | null>(null);
	let addRole = $state<OrganizationRole>('member');
	let adding = $state(false);
	const memberUserIds = $derived(
		members.flatMap((member) => (member.user ? [member.user._id] : []))
	);

	function formatDate(epochMs: number): string {
		return new Date(epochMs).toLocaleDateString();
	}

	async function run(action: () => Promise<unknown>, success: string, failure: string) {
		try {
			await action();
			toast.success(success);
			return true;
		} catch (error) {
			toast.error(error instanceof Error ? error.message : failure);
			return false;
		}
	}

	async function handleSave(event: SubmitEvent) {
		event.preventDefault();
		if (!organization) return;
		saving = true;
		// Only the edited fields, so a change made elsewhere meanwhile isn't overwritten
		const done = await run(
			() =>
				client.mutation(api.admin.mutations.updateOrganization, {
					organizationId: organization._id,
					name: name.trim() !== organization.name ? name : undefined,
					slug: slug.trim() !== organization.slug ? slug.trim() : undefined
				}),
			'Saved the organization',
			'Failed to save the organization'
		);
		// Show what the server stored, such as the trimmed name
		if (done && organization) {
			name = organization.name;
			slug = organization.slug;
			loaded = { id: organization._id, name: organization.name, slug: organization.slug };
		}
		saving = false;
	}

	async function handleCropped(url: string) {
		if (!organization) return;
		const { _id } = organization;
		logoPreview = url;
		logoBusy = true;
		await run(
			async () => {
				const file = await optimizeImage(await getFileFromUrl(url, 'logo.png'), {
					maxWidth: 512,
					maxHeight: 512,
					maxSizeKB: 500,
					quality: 0.85,
					format: 'webp',
					forceConvert: true
				});
				const uploadUrl = await client.mutation(api.storage.generateUploadUrl, {});
				const response = await fetch(uploadUrl, {
					method: 'POST',
					headers: { 'Content-Type': file.type },
					body: file
				});
				if (!response.ok) throw new Error('Failed to upload the logo');
				const { storageId } = (await response.json()) as { storageId: Id<'_storage'> };
				await client.mutation(api.admin.mutations.updateOrganization, {
					organizationId: _id,
					logoId: storageId
				});
			},
			'Updated the logo',
			'Failed to update the logo'
		);
		logoPreview = null;
		logoBusy = false;
	}

	async function handleRemoveLogo() {
		if (!organization) return;
		const { _id } = organization;
		logoBusy = true;
		await run(
			() =>
				client.mutation(api.admin.mutations.updateOrganization, {
					organizationId: _id,
					logoId: null
				}),
			'Removed the logo',
			'Failed to remove the logo'
		);
		logoBusy = false;
	}

	let roleResets = $state(0);

	function handleRoleChange(member: AdminMember, role: OrganizationRole) {
		if (role === member.role) return;
		// Selecting what a member with several roles already shows makes that their only role
		void run(
			() => client.mutation(api.admin.mutations.updateMemberRole, { memberId: member._id, role }),
			`${member.user?.name} is now ${role === 'admin' ? 'an admin' : 'a member'}`,
			'Failed to change the role'
		).then((done) => {
			if (!done) roleResets++;
		});
	}

	function handleRemove(member: AdminMember) {
		void run(
			() => client.mutation(api.admin.mutations.removeMember, { memberId: member._id }),
			`Removed ${member.user?.name} from ${organization?.name}`,
			'Failed to remove the member'
		);
	}

	/** Opens the transfer dialog, with `successor` as the new owner when given. */
	function openTransfer(successor?: AdminMember) {
		successorId = successor?._id ?? successors[0]?._id ?? '';
		previousOwner = 'admin';
		transferOpen = true;
	}

	async function handleTransfer(event: SubmitEvent) {
		event.preventDefault();
		const successor = successors.find((member) => member._id === successorId);
		if (!successor) return;
		transferring = true;
		const done = await run(
			() =>
				client.mutation(api.admin.mutations.transferOwnership, {
					memberId: successor._id,
					previousOwner
				}),
			`${successor.user?.name} now owns ${organization?.name}`,
			'Failed to transfer the ownership'
		);
		transferring = false;
		if (done) transferOpen = false;
	}

	function openAdd() {
		addUser = null;
		addRole = 'member';
		addOpen = true;
	}

	async function handleAdd(event: SubmitEvent) {
		event.preventDefault();
		if (!organization || !addUser) return;
		const user = addUser;
		adding = true;
		const done = await run(
			() =>
				client.mutation(api.admin.mutations.addMember, {
					userId: user.id,
					organizationId: organization._id,
					role: addRole
				}),
			`Added ${user.name} to ${organization.name}`,
			'Failed to add the member'
		);
		adding = false;
		if (done) addOpen = false;
	}
</script>

{#snippet roleBadge(label: string, owner = false)}
	<Badge variant={owner ? 'default' : 'secondary'} class="capitalize">{label}</Badge>
{/snippet}

<div class="flex flex-col gap-6 py-4">
	<Button variant="ghost" class="w-fit gap-2 px-2 text-sm" data-admin-back="" onclick={onBack}>
		<ArrowLeftIcon class="size-4" aria-hidden="true" />
		Organizations
	</Button>

	{#if detailsQuery.error}
		<div class="text-sm text-destructive">{detailsQuery.error.message}</div>
	{:else if details === undefined}
		<div class="flex items-center gap-2 text-sm text-muted-foreground" role="status">
			<Loader2Icon class="size-4 animate-spin" aria-hidden="true" />
			Loading organization...
		</div>
	{:else if !details || !organization}
		<div class="text-sm text-muted-foreground">This organization doesn't exist anymore.</div>
	{:else}
		<!-- Header -->
		<header class="flex items-start gap-4">
			<Avatar.Root class="size-16 shrink-0 rounded-md">
				<Avatar.Image src={organization.logo ?? undefined} alt={organization.name} />
				<Avatar.Fallback class="rounded-md">
					<AvatarMarble name={organization.name} />
				</Avatar.Fallback>
			</Avatar.Root>
			<div class="flex min-w-0 flex-1 flex-col gap-1">
				<h2 class="truncate font-heading text-xl">{organization.name}</h2>
				<p class="truncate text-sm text-muted-foreground">{organization.slug}</p>
				<div class="flex items-center gap-1 text-xs text-muted-foreground">
					<span class="shrink-0">Organization ID</span>
					<code class="truncate">{organization._id}</code>
					<CopyButton
						text={organization._id}
						class="size-6"
						tabindex={0}
						aria-label="Copy organization ID"
					/>
				</div>
			</div>
			<OrganizationActionsMenu {organization} deleteDisabled={!canTransfer} onDeleted={onBack} />
		</header>

		<!-- Profile -->
		<section class="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
			<h3 class="font-heading text-base">Profile</h3>
			<div class="flex items-center gap-4">
				<ImageCropper.Root bind:src={cropSrc} accept="image/*" onCropped={handleCropped}>
					<!-- Unusable while a logo uploads, so uploads don't overlap -->
					<ImageCropper.UploadTrigger
						class="block cursor-pointer rounded-md"
						aria-label="Upload a new logo"
						inert={logoBusy}
						aria-disabled={logoBusy}
					>
						<div class="relative">
							<Avatar.Root class="size-16 rounded-md">
								<Avatar.Image
									src={logoPreview ?? organization.logo ?? undefined}
									alt={organization.name}
								/>
								<Avatar.Fallback class="rounded-md bg-muted">
									<Building2Icon class="size-8 text-muted-foreground" aria-hidden="true" />
								</Avatar.Fallback>
							</Avatar.Root>
							{#if logoBusy}
								<div
									class="absolute inset-0 flex items-center justify-center rounded-md bg-background/70"
								>
									<Loader2Icon class="size-5 animate-spin" aria-hidden="true" />
								</div>
							{/if}
							<div
								class="absolute -right-1.5 -bottom-1.5 flex size-4 items-center justify-center rounded-full bg-background ring-2 ring-background"
							>
								<PencilIcon class="size-3" aria-hidden="true" />
							</div>
						</div>
					</ImageCropper.UploadTrigger>
					<ImageCropper.Dialog>
						<ImageCropper.Cropper cropShape="rect" />
						<ImageCropper.Controls>
							<ImageCropper.Cancel />
							<ImageCropper.Crop />
						</ImageCropper.Controls>
					</ImageCropper.Dialog>
				</ImageCropper.Root>
				<div class="flex flex-col gap-1">
					<span class="text-sm">Logo</span>
					<span class="text-xs text-muted-foreground">Click the logo to upload a new one.</span>
					{#if organization.logo}
						<Button
							variant="ghost"
							size="sm"
							class="-ml-2 w-fit text-destructive"
							onclick={handleRemoveLogo}
							disabled={logoBusy}
						>
							Remove logo
						</Button>
					{/if}
				</div>
			</div>
			<form class="flex flex-col gap-3" onsubmit={handleSave}>
				<fieldset class="grid gap-3 sm:grid-cols-2" disabled={saving}>
					<Label class="flex-col items-start gap-1.5">
						<span>Name</span>
						<Input type="text" bind:value={name} autocomplete="off" required />
					</Label>
					<Label class="flex-col items-start gap-1.5">
						<span>Slug</span>
						<Input
							type="text"
							bind:value={slug}
							autocomplete="off"
							pattern="[a-z0-9\-]+"
							title="Lowercase letters, numbers and hyphens"
							required
						/>
					</Label>
				</fieldset>
				<div class="flex flex-wrap items-center justify-between gap-3">
					<p class="text-xs text-muted-foreground">
						The slug can show in URLs: links with the old slug stop working.
					</p>
					<Button type="submit" disabled={!isDirty || saving} aria-busy={saving}>
						{#if saving}
							<Loader2Icon class="size-4 animate-spin" aria-hidden="true" />
							Saving...
						{:else}
							Save
						{/if}
					</Button>
				</div>
			</form>
			<dl class="grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-3">
				<div>
					<dt class="text-xs text-muted-foreground">Created</dt>
					<dd>{formatDate(organization.createdAt)}</dd>
				</div>
				<div>
					<dt class="text-xs text-muted-foreground">Owner</dt>
					<dd class="truncate">
						{owners.map((owner) => owner.user?.name ?? 'Deleted user').join(', ') || 'None'}
					</dd>
				</div>
				<div>
					<dt class="text-xs text-muted-foreground">Members</dt>
					<dd>{members.length}</dd>
				</div>
			</dl>
		</section>

		<!-- Members -->
		<section class="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
			<div class="flex items-center justify-between gap-3">
				<h3 class="font-heading text-base">Members</h3>
				<Button variant="secondary" size="sm" class="gap-2" onclick={openAdd}>
					<PlusIcon class="size-4" aria-hidden="true" />
					Add member
				</Button>
			</div>
			{#if hasLockedMembers}
				<p class="text-xs text-muted-foreground">
					Members who are app admins keep their role and membership here until their admin role is
					removed.
				</p>
			{/if}
			{#if members.length === 0}
				<p class="text-sm text-muted-foreground">No members.</p>
			{:else}
				<table class="w-full">
					<thead>
						<tr>
							<th class="p-2 !pl-0 text-left text-xs font-semibold text-muted-foreground">User</th>
							<th class="hidden w-28 p-2 text-left text-xs text-muted-foreground md:table-cell">
								Joined
							</th>
							<th class="w-36 p-2 text-left text-xs text-muted-foreground">Role</th>
							<th class="w-12 p-2"><span class="sr-only">Actions</span></th>
						</tr>
					</thead>
					<tbody>
						{#each members as member (member._id)}
							{@const memberUser = member.user}
							{@const owner = isOwner(member)}
							{@const locked = isLocked(member)}
							<tr
								class="border-t border-border {memberUser ? 'cursor-pointer hover:bg-accent' : ''}"
								onclick={() => memberUser && onViewProfile(memberUser._id)}
							>
								<td class="max-w-0 !py-3 !pl-0">
									<div class="flex items-center gap-3">
										<Avatar.Root class="size-8 shrink-0">
											<Avatar.Image
												src={memberUser?.image ?? undefined}
												alt={memberUser?.name ?? ''}
											/>
											<Avatar.Fallback>
												<AvatarMarble name={memberUser?.name ?? '?'} />
											</Avatar.Fallback>
										</Avatar.Root>
										<div class="flex min-w-0 flex-col">
											<div class="flex min-w-0 items-center gap-2">
												{#if memberUser}
													<!-- The keyboard way to the profile; the row handles pointer clicks -->
													<button
														type="button"
														class="truncate text-left text-sm font-medium hover:underline"
														data-admin-focus={memberUser._id}
														onclick={(event) => {
															event.stopPropagation();
															onViewProfile(memberUser._id);
														}}
													>
														{memberUser.name}
													</button>
												{:else}
													<span class="truncate text-sm text-muted-foreground">Deleted user</span>
												{/if}
												{#if memberUser && memberUser._id === activeUserId}
													<Badge variant="secondary" class="shrink-0">You</Badge>
												{/if}
												{#if memberUser?.isAppAdmin}
													<Badge variant="outline" class="shrink-0">Admin</Badge>
												{/if}
												{#if memberUser?.banned}
													<Badge variant="destructive" class="shrink-0">Banned</Badge>
												{/if}
											</div>
											<span class="truncate text-xs text-muted-foreground">{memberUser?.email}</span
											>
										</div>
									</div>
								</td>
								<td class="hidden text-sm text-muted-foreground md:table-cell">
									{formatDate(member.createdAt)}
								</td>
								<!-- Clicks on the role and the menu don't open the profile -->
								<td onclick={(event) => event.stopPropagation()}>
									{#if owner}
										{@render roleBadge('Owner', true)}
									{:else if locked || !memberUser}
										{@render roleBadge(roleOf(member))}
									{:else}
										<!-- Re-created when a change fails, so it shows the stored role again -->
										{#key roleResets}
											<Select.Root
												type="single"
												value={roleOf(member)}
												onValueChange={(value: string) =>
													handleRoleChange(member, value as OrganizationRole)}
											>
												<Select.Trigger
													class="w-full text-sm"
													aria-label={`Role of ${memberUser?.name}`}
												>
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
										{/key}
									{/if}
								</td>
								<td class="text-right" onclick={(event) => event.stopPropagation()}>
									<Menu.Root>
										<Menu.Trigger
											class={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
											aria-label={`Actions for ${memberUser?.name ?? 'deleted user'}`}
										>
											<EllipsisVerticalIcon class="size-4" aria-hidden="true" />
										</Menu.Trigger>
										<Menu.Content class="min-w-52">
											{#if memberUser}
												<Menu.Item onSelect={() => onViewProfile(memberUser._id)}>
													<CircleUserIcon aria-hidden="true" />
													View profile
												</Menu.Item>
											{/if}
											{#if owner}
												<Menu.Item
													disabled={!canTransfer || successors.length === 0}
													onSelect={() => openTransfer()}
												>
													<CrownIcon aria-hidden="true" />
													Transfer ownership
												</Menu.Item>
											{:else if !locked}
												{#if memberUser}
													<Menu.Item disabled={!canTransfer} onSelect={() => openTransfer(member)}>
														<CrownIcon aria-hidden="true" />
														Make owner
													</Menu.Item>
													<Menu.Separator />
												{/if}
												<Menu.Item variant="destructive" onSelect={() => handleRemove(member)}>
													<UserMinusIcon aria-hidden="true" />
													Remove from organization
												</Menu.Item>
											{/if}
										</Menu.Content>
									</Menu.Root>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
				{#if owners.length > 0 && !canTransfer}
					<p class="text-xs text-muted-foreground">
						The owner is an app admin: remove their admin role to hand over the ownership or delete
						the organization.
					</p>
				{:else if owners.length > 0 && successors.length === 0}
					<p class="text-xs text-muted-foreground">
						To hand over the ownership, add another member first.
					</p>
				{/if}
			{/if}
		</section>
	{/if}

	<!-- Transfer ownership dialog -->
	<Dialog.Root bind:open={transferOpen}>
		<Dialog.Content class="md:max-w-lg">
			<Dialog.Header class="pr-8">
				<Dialog.Title>Transfer ownership of {organization?.name}</Dialog.Title>
				<Dialog.Description>
					The new owner can manage and delete the organization, and can't be removed from it until
					they hand it over.
				</Dialog.Description>
			</Dialog.Header>
			<form id={`${formId}-transfer`} class="flex w-full flex-col gap-3" onsubmit={handleTransfer}>
				<Label class="flex-col items-start gap-1.5">
					<span>New owner</span>
					<select
						class="h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none"
						bind:value={successorId}
						required
					>
						{#each successors as member (member._id)}
							<option value={member._id}>{member.user?.name} ({member.user?.email})</option>
						{/each}
					</select>
				</Label>
				{#if owners.length > 0}
					<Label class="flex-col items-start gap-1.5">
						<span>
							{owners.length === 1
								? `${owners[0].user?.name ?? 'The previous owner'} becomes`
								: 'The previous owners become'}
						</span>
						<select
							class="h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none"
							bind:value={previousOwner}
						>
							<option value="admin">Admin</option>
							<option value="member">Member</option>
							<option value="remove">Removed from the organization</option>
						</select>
					</Label>
				{/if}
			</form>
			<Dialog.Footer>
				<Dialog.Close class={buttonVariants({ variant: 'secondary' })} disabled={transferring}>
					Cancel
				</Dialog.Close>
				<Button
					type="submit"
					form={`${formId}-transfer`}
					disabled={transferring || !successorId}
					aria-busy={transferring}
				>
					{#if transferring}
						<Loader2Icon class="size-4 animate-spin" aria-hidden="true" />
						Transferring...
					{:else}
						Transfer ownership
					{/if}
				</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>

	<!-- Add member dialog -->
	<Dialog.Root bind:open={addOpen}>
		<Dialog.Content class="md:max-w-lg">
			<Dialog.Header class="pr-8">
				<Dialog.Title>Add a member to {organization?.name}</Dialog.Title>
				<Dialog.Description>
					They become a member right away, without an invitation.
				</Dialog.Description>
			</Dialog.Header>
			<form id={`${formId}-add`} class="flex w-full flex-col gap-3" onsubmit={handleAdd}>
				<div class="flex flex-col gap-1.5">
					<Label for={`${formId}-add-user`}>User</Label>
					<UserSelect
						id={`${formId}-add-user`}
						bind:value={addUser}
						excludeIds={memberUserIds}
						unavailableReason={(user) =>
							user.isAppAdmin && user.id !== activeUserId
								? 'App admin: remove their admin role first'
								: undefined}
					/>
				</div>
				<Label class="flex-col items-start gap-1.5">
					<span>Role</span>
					<select
						class="h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none"
						bind:value={addRole}
					>
						<option value="member">Member</option>
						<option value="admin">Admin</option>
					</select>
				</Label>
			</form>
			<Dialog.Footer>
				<Dialog.Close class={buttonVariants({ variant: 'secondary' })} disabled={adding}>
					Cancel
				</Dialog.Close>
				<Button
					type="submit"
					form={`${formId}-add`}
					disabled={adding || !addUser}
					aria-busy={adding}
				>
					{#if adding}
						<Loader2Icon class="size-4 animate-spin" aria-hidden="true" />
						Adding...
					{:else}
						Add
					{/if}
				</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
</div>
