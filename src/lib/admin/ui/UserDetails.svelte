<script lang="ts">
	// Svelte
	import { untrack } from 'svelte';
	// Primitives
	import * as Avatar from '#lib/ui/avatar/index.js';
	import AvatarMarble from '#lib/ui/avatar/avatar-marble.svelte';
	import * as Dialog from '#lib/ui/dialog/index.js';
	import * as Select from '#lib/ui/select/index.js';
	import { CopyButton } from '#lib/ui/copy-button/index.js';
	import { Badge } from '#lib/ui/badge/index.js';
	import { Button, buttonVariants } from '#lib/ui/button/index.js';
	import { Input } from '#lib/ui/input/index.js';
	import { Label } from '#lib/ui/label/index.js';
	// Icons
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import Loader2Icon from '@lucide/svelte/icons/loader-2';
	import LockOpenIcon from '@lucide/svelte/icons/lock-open';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import XIcon from '@lucide/svelte/icons/x';
	// Components
	import OrganizationSelect from '#lib/admin/ui/OrganizationSelect.svelte';
	import UserActionsMenu from '#lib/admin/ui/UserActionsMenu.svelte';
	import UserDialogs from '#lib/admin/ui/UserDialogs.svelte';
	// API
	import { useQuery, useConvexClient } from 'convex-svelte';
	import { useAuth } from '@mmailaender/convex-better-auth-svelte/svelte';
	import { getAuthContext } from '#lib/auth/context.svelte.js';
	import { toast } from 'svelte-sonner';
	// Utils
	import { describeUserAgent } from '#lib/admin/utils/userAgent.js';
	// Types
	import type {
		AdminMembership,
		AdminOrganization,
		OrganizationRole,
		UserDialog
	} from '#lib/admin/types.js';

	let {
		userId,
		backLabel = 'Users',
		onBack,
		onViewOrganization
	}: {
		userId: string;
		/** Label of the back button, naming where it returns to */
		backLabel?: string;
		/** Returns to where the admin came from */
		onBack: () => void;
		/** Opens the page of an organization */
		onViewOrganization: (organizationId: string) => void;
	} = $props();

	const { api, authConstants } = getAuthContext();
	const client = useConvexClient();
	const auth = useAuth();
	const organizationsEnabled = Boolean(authConstants.organizations);
	const formId = $props.id();

	const roleOptions: { label: string; value: OrganizationRole }[] = [
		{ label: 'Member', value: 'member' },
		{ label: 'Admin', value: 'admin' }
	];

	const activeUserResponse = useQuery(api.users.queries.getActiveUser, () =>
		auth.isAuthenticated ? {} : 'skip'
	);
	const detailsQuery = useQuery(api.admin.queries.getUser, () => ({ userId }));
	const details = $derived(detailsQuery.data);
	const user = $derived(details?.user ?? null);
	const sessionsQuery = useQuery(api.admin.queries.listUserSessions, () =>
		user ? { userId: user.id } : 'skip'
	);

	const isSelf = $derived(user?.id === activeUserResponse?.data?._id);
	// Changing the profile or the sessions of another admin needs their admin role removed
	// first: see `assertCanManageUser`
	const canManage = $derived(Boolean(user) && (isSelf || !user?.isAppAdmin));

	let dialog = $state<UserDialog | null>(null);
	let unbanning = $state(false);

	// The newest sessions, until the admin asks for all of them
	const SESSIONS_SHOWN = 5;
	let showAllSessions = $state(false);
	const sessions = $derived(
		showAllSessions ? sessionsQuery.data : sessionsQuery.data?.slice(0, SESSIONS_SHOWN)
	);

	// Profile form. Fields the admin hasn't edited follow the user as it changes elsewhere
	let name = $state('');
	let email = $state('');
	let saving = $state(false);
	let loaded: { id: string; name: string; email: string } | null = null;
	$effect(() => {
		if (!user) return;
		const next = { id: user.id, name: user.name, email: user.email };
		untrack(() => {
			const otherUser = loaded?.id !== next.id;
			if (otherUser || name === loaded?.name) name = next.name;
			if (otherUser || email === loaded?.email) email = next.email;
			loaded = next;
		});
	});
	const isDirty = $derived(
		Boolean(user) && (name.trim() !== user?.name || email.trim().toLowerCase() !== user?.email)
	);

	// Add to organization dialog
	let addOpen = $state(false);
	let addOrganization = $state<AdminOrganization | null>(null);
	let addRole = $state<OrganizationRole>('member');
	let adding = $state(false);
	const memberOrganizationIds = $derived(
		details?.memberships.map((membership) => membership.organization._id) ?? []
	);

	function formatDate(epochMs: number): string {
		return new Date(epochMs).toLocaleDateString();
	}

	function formatDateTime(epochMs: number): string {
		return new Date(epochMs).toLocaleString();
	}

	const banDescription = $derived.by(() => {
		if (!user?.banned) return '';
		const until = user.banExpires ? `until ${formatDateTime(user.banExpires)}` : 'permanently';
		return `Banned ${until}${user.banReason ? `: ${user.banReason}` : '.'}`;
	});

	/** A member's roles, which Better Auth stores comma-separated. */
	function rolesOf(membership: AdminMembership): string[] {
		return membership.role.split(',').map((role) => role.trim());
	}

	function isOwner(membership: AdminMembership): boolean {
		return rolesOf(membership).includes('owner');
	}

	/** The role the role select shows: a member with several roles shows the highest. */
	function roleOf(membership: AdminMembership): OrganizationRole {
		return rolesOf(membership).includes('admin') ? 'admin' : 'member';
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
		if (!user) return;
		saving = true;
		// Only the edited fields, so a change made elsewhere meanwhile isn't overwritten
		const done = await run(
			() =>
				client.mutation(api.admin.mutations.updateUser, {
					userId: user.id,
					name: name.trim() !== user.name ? name : undefined,
					email: email.trim().toLowerCase() !== user.email ? email : undefined
				}),
			'Saved the profile',
			'Failed to save the profile'
		);
		// Show what the server stored, such as the lowercased email
		if (done && user) {
			name = user.name;
			email = user.email;
			loaded = { id: user.id, name: user.name, email: user.email };
		}
		saving = false;
	}

	let roleResets = $state(0);

	function handleRoleChange(membership: AdminMembership, role: OrganizationRole) {
		if (role === membership.role) return;
		// Selecting what a member with several roles already shows makes that their only role
		void run(
			() =>
				client.mutation(api.admin.mutations.updateMemberRole, {
					memberId: membership._id,
					role
				}),
			`${user?.name} is now ${role === 'admin' ? 'an admin' : 'a member'} of ${membership.organization.name}`,
			'Failed to change the role'
		).then((done) => {
			if (!done) roleResets++;
		});
	}

	function handleRemoveMembership(membership: AdminMembership) {
		void run(
			() => client.mutation(api.admin.mutations.removeMember, { memberId: membership._id }),
			`Removed ${user?.name} from ${membership.organization.name}`,
			'Failed to remove the membership'
		);
	}

	function openAddDialog() {
		addOrganization = null;
		addRole = 'member';
		addOpen = true;
	}

	async function handleAdd(event: SubmitEvent) {
		event.preventDefault();
		if (!user || !addOrganization) return;
		const organization = addOrganization;
		adding = true;
		const done = await run(
			() =>
				client.mutation(api.admin.mutations.addMember, {
					userId: user.id,
					organizationId: organization._id,
					role: addRole
				}),
			`Added ${user.name} to ${organization.name}`,
			'Failed to add to the organization'
		);
		adding = false;
		if (done) addOpen = false;
	}

	async function handleUnban() {
		if (!user) return;
		const { id, name } = user;
		unbanning = true;
		await run(
			() => client.mutation(api.admin.mutations.unbanUser, { userId: id }),
			`Unbanned ${name}`,
			'Failed to unban user'
		);
		unbanning = false;
	}

	function handleRevokeSession(sessionId: string) {
		void run(
			() => client.mutation(api.admin.mutations.revokeUserSession, { sessionId }),
			'Signed out the session',
			'Failed to sign out the session'
		);
	}
</script>

<div class="flex flex-col gap-6 py-4">
	<Button variant="ghost" class="w-fit gap-2 px-2 text-sm" data-admin-back="" onclick={onBack}>
		<ArrowLeftIcon class="size-4" aria-hidden="true" />
		{backLabel}
	</Button>

	{#if detailsQuery.error}
		<div class="text-sm text-destructive">{detailsQuery.error.message}</div>
	{:else if details === undefined}
		<div class="flex items-center gap-2 text-sm text-muted-foreground" role="status">
			<Loader2Icon class="size-4 animate-spin" aria-hidden="true" />
			Loading user...
		</div>
	{:else if !details || !user}
		<div class="text-sm text-muted-foreground">This user doesn't exist anymore.</div>
	{:else}
		<!-- Header -->
		<header class="flex items-start gap-4">
			<Avatar.Root class="size-16 shrink-0">
				<Avatar.Image src={user.image ?? undefined} alt={user.name} />
				<Avatar.Fallback>
					<AvatarMarble name={user.name} />
				</Avatar.Fallback>
			</Avatar.Root>
			<div class="flex min-w-0 flex-1 flex-col gap-1">
				<div class="flex flex-wrap items-center gap-2">
					<h2 class="truncate font-heading text-xl">{user.name}</h2>
					{#if isSelf}
						<Badge variant="secondary">You</Badge>
					{/if}
					{#if user.isAppAdmin}
						<Badge
							variant="outline"
							title={user.isBootstrapAdmin
								? 'Admin through the ADMIN_USER_IDS environment variable'
								: undefined}
						>
							Admin
						</Badge>
					{/if}
					{#if user.banned}
						<Badge variant="destructive">Banned</Badge>
					{/if}
				</div>
				<p class="truncate text-sm text-muted-foreground">{user.email}</p>
				<div class="flex items-center gap-1 text-xs text-muted-foreground">
					<span class="shrink-0">User ID</span>
					<code class="truncate">{user.id}</code>
					<CopyButton text={user.id} class="size-6" tabindex={0} aria-label="Copy user ID" />
				</div>
			</div>
			<UserActionsMenu {user} {isSelf} onDialog={(next) => (dialog = next)} />
		</header>

		{#if user.banned}
			<div
				class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm"
			>
				<p class="min-w-0">{banDescription}</p>
				{#if !isSelf}
					<Button
						variant="secondary"
						size="sm"
						class="shrink-0 gap-2"
						onclick={handleUnban}
						disabled={unbanning}
						aria-busy={unbanning}
					>
						{#if unbanning}
							<Loader2Icon class="size-4 animate-spin" aria-hidden="true" />
						{:else}
							<LockOpenIcon class="size-4" aria-hidden="true" />
						{/if}
						Lift ban
					</Button>
				{/if}
			</div>
		{/if}

		<!-- Profile -->
		<section class="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
			<h3 class="font-heading text-base">Profile</h3>
			<form class="flex flex-col gap-3" onsubmit={handleSave}>
				<fieldset class="grid gap-3 sm:grid-cols-2" disabled={!canManage || saving}>
					<Label class="flex-col items-start gap-1.5">
						<span>Name</span>
						<Input type="text" bind:value={name} autocomplete="off" required />
					</Label>
					<Label class="flex-col items-start gap-1.5">
						<span>Email</span>
						<Input type="email" bind:value={email} autocomplete="off" required />
					</Label>
				</fieldset>
				<div class="flex flex-wrap items-center justify-between gap-3">
					<p class="text-xs text-muted-foreground">
						{#if canManage}
							A new email counts as verified, and they sign in with it from now on.
						{:else}
							Remove their admin role to change their profile.
						{/if}
					</p>
					{#if canManage}
						<Button type="submit" disabled={!isDirty || saving} aria-busy={saving}>
							{#if saving}
								<Loader2Icon class="size-4 animate-spin" aria-hidden="true" />
								Saving...
							{:else}
								Save
							{/if}
						</Button>
					{/if}
				</div>
			</form>
			<dl class="grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-3">
				<div>
					<dt class="text-xs text-muted-foreground">Joined</dt>
					<dd>{formatDate(user.createdAt)}</dd>
				</div>
				<div>
					<dt class="text-xs text-muted-foreground">Email</dt>
					<dd>{user.emailVerified ? 'Verified' : 'Not verified'}</dd>
				</div>
				<div>
					<dt class="text-xs text-muted-foreground">Role</dt>
					<dd>
						{#if user.isBootstrapAdmin}
							Admin (ADMIN_USER_IDS)
						{:else}
							{user.isAppAdmin ? 'Admin' : 'User'}
						{/if}
					</dd>
				</div>
			</dl>
		</section>

		<!-- Organizations -->
		{#if organizationsEnabled}
			<section class="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
				<div class="flex items-center justify-between gap-3">
					<h3 class="font-heading text-base">Organizations</h3>
					{#if canManage}
						<Button variant="secondary" size="sm" class="gap-2" onclick={openAddDialog}>
							<PlusIcon class="size-4" aria-hidden="true" />
							Add to organization
						</Button>
					{/if}
				</div>
				{#if !canManage}
					<p class="text-xs text-muted-foreground">
						Remove their admin role to change their organizations.
					</p>
				{/if}
				{#if details.memberships.length === 0}
					<p class="text-sm text-muted-foreground">Not a member of any organization.</p>
				{:else}
					<ul class="flex flex-col">
						{#each details.memberships as membership (membership._id)}
							<li class="flex items-center gap-3 border-t border-border py-3 first:border-t-0">
								<Avatar.Root class="size-8 shrink-0 rounded-md">
									<Avatar.Image
										src={membership.organization.logo ?? undefined}
										alt={membership.organization.name}
									/>
									<Avatar.Fallback class="rounded-md">
										<AvatarMarble name={membership.organization.name} />
									</Avatar.Fallback>
								</Avatar.Root>
								<div class="flex min-w-0 flex-1 flex-col items-start">
									<button
										type="button"
										class="max-w-full truncate text-left text-sm hover:underline"
										onclick={() => onViewOrganization(membership.organization._id)}
									>
										{membership.organization.name}
									</button>
									<span class="max-w-full truncate text-xs text-muted-foreground">
										{membership.organization.slug}
									</span>
								</div>
								{#if isOwner(membership)}
									<Badge
										variant="default"
										title="Hand over the ownership on the organization's page to change their role or remove them"
									>
										Owner
									</Badge>
									<!-- Keeps the role column aligned with the rows that have a remove button -->
									<span class="size-8 shrink-0" aria-hidden="true"></span>
								{:else if !canManage}
									<Badge variant="secondary" class="capitalize">{roleOf(membership)}</Badge>
									<span class="size-8 shrink-0" aria-hidden="true"></span>
								{:else}
									<div class="w-32 shrink-0">
										<!-- Re-created when a change fails, so it shows the stored role again -->
										{#key roleResets}
											<Select.Root
												type="single"
												value={roleOf(membership)}
												onValueChange={(value: string) =>
													handleRoleChange(membership, value as OrganizationRole)}
											>
												<Select.Trigger
													class="w-full text-sm"
													aria-label={`Role in ${membership.organization.name}`}
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
									</div>
									<Button
										variant="ghost"
										size="icon-sm"
										class="shrink-0"
										aria-label={`Remove from ${membership.organization.name}`}
										title={`Remove from ${membership.organization.name}`}
										onclick={() => handleRemoveMembership(membership)}
									>
										<XIcon class="size-4" aria-hidden="true" />
									</Button>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		{/if}

		<!-- Sessions -->
		<section class="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
			<h3 class="font-heading text-base">
				Active sessions
				{#if sessionsQuery.data?.length}
					<span class="font-normal text-muted-foreground">({sessionsQuery.data.length})</span>
				{/if}
			</h3>
			{#if sessionsQuery.error}
				<p class="text-sm text-destructive">{sessionsQuery.error.message}</p>
			{:else if !sessionsQuery.data}
				<p class="flex items-center gap-2 text-sm text-muted-foreground" role="status">
					<Loader2Icon class="size-4 animate-spin" aria-hidden="true" />
					Loading sessions...
				</p>
			{:else if sessionsQuery.data.length === 0}
				<p class="text-sm text-muted-foreground">Not signed in anywhere.</p>
			{:else}
				<ul class="flex flex-col">
					{#each sessions ?? [] as session (session.id)}
						<li class="flex items-center gap-3 border-t border-border py-3 first:border-t-0">
							<div class="flex min-w-0 flex-1 flex-col">
								<div class="flex items-center gap-2">
									<span class="truncate text-sm">{describeUserAgent(session.userAgent)}</span>
									{#if session.impersonatedBy}
										<Badge variant="secondary" class="shrink-0">Impersonation</Badge>
									{/if}
								</div>
								<span class="truncate text-xs text-muted-foreground">
									{session.ipAddress ? `${session.ipAddress} · ` : ''}Signed in {formatDateTime(
										session.createdAt
									)}
								</span>
							</div>
							{#if canManage}
								<Button
									variant="ghost"
									size="sm"
									class="shrink-0 gap-2"
									onclick={() => handleRevokeSession(session.id)}
								>
									<LogOutIcon class="size-4" aria-hidden="true" />
									Sign out
								</Button>
							{/if}
						</li>
					{/each}
				</ul>
				{#if sessionsQuery.data.length > SESSIONS_SHOWN}
					<Button
						variant="ghost"
						size="sm"
						class="w-fit"
						onclick={() => (showAllSessions = !showAllSessions)}
					>
						{showAllSessions ? 'Show fewer' : `Show all ${sessionsQuery.data.length} sessions`}
					</Button>
				{/if}
			{/if}
		</section>
	{/if}

	<UserDialogs {user} bind:dialog onDeleted={onBack} />

	<!-- Add to organization dialog -->
	<Dialog.Root bind:open={addOpen}>
		<Dialog.Content class="md:max-w-lg">
			<Dialog.Header class="pr-8">
				<Dialog.Title>Add {user?.name} to an organization</Dialog.Title>
				<Dialog.Description>
					They become a member right away, without an invitation.
				</Dialog.Description>
			</Dialog.Header>
			<form id={`${formId}-add`} class="flex w-full flex-col gap-3" onsubmit={handleAdd}>
				<div class="flex flex-col gap-1.5">
					<Label for={`${formId}-add-organization`}>Organization</Label>
					<OrganizationSelect
						id={`${formId}-add-organization`}
						bind:value={addOrganization}
						excludeIds={memberOrganizationIds}
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
					disabled={adding || !addOrganization}
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
