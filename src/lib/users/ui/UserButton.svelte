<script lang="ts">
	// Primitives
	import * as Popover from '../../ui/popover';
	import * as Dialog from '../../ui/dialog';
	import * as Avatar from '../../ui/avatar';
	import AvatarMarble from '../../ui/avatar/avatar-marble.svelte';
	import { Button } from '../../ui/button';
	// Icons
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	// Components
	import SignIn from '../../auth/ui/SignIn.svelte';
	import SignOutButton from '../../auth/ui/SignOutButton.svelte';

	// SvelteKit navigation/state
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	// API
	import { useAuth } from '@mmailaender/convex-better-auth-svelte/svelte';
	import { useQuery } from 'convex-svelte';
	import { getAuthContext } from '../../auth/context.svelte';
	const { api } = getAuthContext();

	// Constants
	import { DIALOG_KEY } from '../utils/user.constants';

	// Types
	import type { Snippet } from 'svelte';
	import type { Path } from '$app/types';
	import type { GetActiveUserType, ListAccountsType } from '../../auth/types';

	// Props
	const {
		popoverPlacement = 'bottom',
		initialData,
		signInTrigger

		/** Optional replacement for the default sign-in button. Receives `open` to
		 * launch the UserButton-owned sign-in dialog. */
	}: {
		popoverPlacement?:
			'top' | 'bottom' | 'left' | 'right' | 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end';
		initialData?: {
			activeUser?: GetActiveUserType;
			accountList?: ListAccountsType;
		};
		signInTrigger?: Snippet<[{ open: () => void }]>;
	} = $props();

	// Auth
	const auth = useAuth();

	// Queries
	const activeUserResponse = useQuery(
		api.users.queries.getActiveUser,
		() => (auth.isAuthenticated ? {} : 'skip'),
		() => ({ initialData: initialData?.activeUser })
	);

	const activeUser = $derived(activeUserResponse?.data);

	// bits-ui v2 has no `positioning` prop; placement is expressed as side/align on Content
	const popoverPositioning = $derived.by(() => {
		const [side, align] = popoverPlacement.split('-') as [
			'top' | 'bottom' | 'left' | 'right',
			'start' | 'end' | undefined
		];
		return { side, align: align ?? 'center', sideOffset: 8 } as const;
	});

	// State
	let userPopoverOpen = $state(false);
	let signInDialogOpen = $state(false);
	let avatarStatus = $state<'loading' | 'loaded' | 'error'>('loading');

	// Ensure SignIn form resets every time the dialog opens
	let signInKey = $state(0);
	let prevSignInDialogOpen = false;

	/**
	 * Open profile modal and close popover (via shallow routing)
	 */
	function openProfileModal(): void {
		userPopoverOpen = false;
		const url = new URL(page.url.href);
		if (url.searchParams.get('dialog') !== DIALOG_KEY) {
			url.searchParams.set('dialog', DIALOG_KEY);
			void goto(resolve(`${url.pathname}${url.search}${url.hash}` as Path), {
				replaceState: false,
				reset: false
			});
		}
	}

	// Bump key when dialog transitions from closed -> open to remount SignIn
	$effect(() => {
		if (signInDialogOpen && !prevSignInDialogOpen) {
			signInKey += 1;
		}
		prevSignInDialogOpen = signInDialogOpen;
	});
</script>

{#if auth.isAuthenticated && activeUser}
	<Popover.Root bind:open={userPopoverOpen}>
		<Popover.Trigger class="nav-util" aria-label="Account menu">
			<Avatar.Root class="user-avatar" onLoadingStatusChange={(status) => (avatarStatus = status)}>
				<Avatar.Image src={activeUser?.image} alt={activeUser?.name} />
				<Avatar.Fallback>
					{#if avatarStatus === 'loading'}
						<div class="user-avatar-pending"></div>
					{:else}
						<AvatarMarble name={activeUser?.name} />
					{/if}
				</Avatar.Fallback>
			</Avatar.Root>
		</Popover.Trigger>
		<Popover.Content {...popoverPositioning}>
			<div class="flex flex-col gap-1 p-0">
				<Button
					variant="ghost"
					class="flex h-auto flex-row items-center gap-4 rounded-lg bg-background p-3 pr-6 duration-200 ease-in-out hover:bg-muted"
					onclick={openProfileModal}
				>
					<Avatar.Root class="size-12">
						<Avatar.Image src={activeUser?.image} alt={activeUser?.name} />
						<Avatar.Fallback>
							<AvatarMarble name={activeUser?.name} />
						</Avatar.Fallback>
					</Avatar.Root>
					<div class="flex flex-1 flex-col gap-0 overflow-hidden">
						<p class="truncate text-left text-sm font-medium">{activeUser?.name}</p>
						<p class="truncate text-left text-xs opacity-75">
							{activeUser?.email}
						</p>
					</div>
					<ChevronRightIcon class="size-4" />
				</Button>
				<SignOutButton
					onSuccess={() => (userPopoverOpen = false)}
					class="h-10 justify-between gap-1 text-sm hover:bg-accent"
				/>
			</div>
		</Popover.Content>
	</Popover.Root>
{:else if auth.isLoading || auth.isAuthenticated}
	<!-- Same box as the signed-in trigger: confirming the session must not change
	     the nav row's height (it used to be 2.5rem here, 1.5rem after). -->
	<div class="nav-util" aria-busy="true">
		<div class="user-avatar user-avatar-pending"></div>
	</div>
{:else if signInTrigger}
	{@render signInTrigger({ open: () => (signInDialogOpen = true) })}
{:else}
	<button type="button" class="nav-util nav-util-text" onclick={() => (signInDialogOpen = true)}>
		Sign in
	</button>
{/if}
<!-- SignIn Dialog - Outside of auth wrappers to prevent disappearing during registration -->
<Dialog.Root
	bind:open={signInDialogOpen}
	onOpenChange={(open) => {
		// When dialog closes, bump the key so next open is a fresh mount
		if (!open) {
			signInKey += 1;
		}
	}}
>
	<Dialog.Content
		class="h-full max-h-dvh w-full rounded-none sm:h-auto sm:max-h-[90vh] sm:w-4xl sm:max-w-md sm:rounded-none"
	>
		{#key signInKey}
			<SignIn onSignIn={() => (signInDialogOpen = false)} class="p-2 sm:p-8" />
		{/key}
	</Dialog.Content>
</Dialog.Root>

<style>
	/* Signed-in and signed-out states share one box (--nav-util-size) and one
	   register (see the `nav-util` utility in app.css), so the auth swap never
	   resizes the nav row. */

	/* The avatar viewport: square-ish chip is wrong for an identity, so this is
	   the one nav trigger that keeps a circle — just desaturated until hover. */
	.user-avatar {
		width: var(--nav-util-size);
		height: var(--nav-util-size);
		flex-shrink: 0;
		filter: grayscale(1);
		transition: filter 0.2s ease;
	}
	:global(.nav-util:hover) .user-avatar,
	:global(.nav-util[aria-expanded='true']) .user-avatar {
		filter: grayscale(0);
	}

	.user-avatar-pending {
		width: var(--nav-util-size);
		height: var(--nav-util-size);
		border-radius: 9999px;
		background: color-mix(in oklch, var(--foreground) 8%, transparent);
		animation: user-pulse 1.4s ease-in-out infinite;
	}
	@keyframes user-pulse {
		50% {
			opacity: 0.45;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.user-avatar-pending {
			animation: none;
		}
	}
</style>
