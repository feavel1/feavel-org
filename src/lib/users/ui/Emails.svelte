<script lang="ts">
	// Svelte
	import { page } from '$app/state';
	// API
	import { useQuery } from 'convex-svelte';
	import { useAuth } from '@mmailaender/convex-better-auth-svelte/svelte';
	import { getAuthContext } from '../../auth/context.svelte';
	const { api, authClient } = getAuthContext();

	// Icons
	import PencilIcon from '@lucide/svelte/icons/pencil';
	// Primitives
	import { Button } from '../../ui/button';
	import { Input } from '../../ui/input';
	import { toast } from 'svelte-sonner';
	import { tick } from 'svelte';

	// Types
	import type { GetActiveUserType } from '../../auth/types';

	// Props
	let { initialData }: { initialData?: { activeUser?: GetActiveUserType } } = $props();

	// Auth
	const auth = useAuth();

	// Query
	const activeUserResponse = useQuery(
		api.users.queries.getActiveUser,
		() => (auth.isAuthenticated ? {} : 'skip'),
		() => ({
			initialData: initialData?.activeUser
		})
	);
	const activeUser = $derived(activeUserResponse?.data);

	// State
	let isEditingEmail: boolean = $state(false);
	let newEmail: string = $state('');
	let isSubmitting: boolean = $state(false);
	let emailInputEl: HTMLInputElement | null = $state(null);

	// Initialize form value when user data is available and not editing
	$effect(() => {
		if (activeUser && !isEditingEmail) {
			newEmail = activeUser.email;
		}
	});

	// Handle form submission to change email
	async function handleSubmit(event: SubmitEvent): Promise<void> {
		event.preventDefault();

		if (!newEmail.trim()) {
			toast.error('Please enter a valid email address');
			return;
		}

		if (newEmail === activeUser?.email) {
			toast.error('New email must be different from current email');
			return;
		}

		try {
			isSubmitting = true;

			const currentUrl = new URL(page.url.href);
			if (
				!currentUrl.searchParams.has('dialog') ||
				currentUrl.searchParams.get('dialog') !== 'profile'
			) {
				currentUrl.searchParams.set('dialog', 'profile');
			}
			await authClient.changeEmail({
				newEmail,
				callbackURL: currentUrl.toString()
			});
			isEditingEmail = false;
			toast.success('Verification email sent to your new email address');
		} catch (err: unknown) {
			const errorMsg = err instanceof Error ? err.message : 'An unknown error occurred';
			toast.error(`Failed to change email: ${errorMsg}`);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="flex flex-col gap-6">
	{#if !activeUser}
		<div class="h-16 w-full animate-pulse rounded-md bg-muted"></div>
	{:else}
		<!-- Inline editable email (matches ProfileInfo.svelte UX) -->
		<div
			class={[
				'relative w-full rounded-lg border border-border transition-all duration-200 ease-in-out',
				{
					'cursor-pointer': !isEditingEmail,
					'hover:bg-muted': !isEditingEmail,
					'hover:border-border': !isEditingEmail
				}
			]}
		>
			<div
				class="flex items-center justify-between gap-3 px-3 py-1.5 transition-all duration-200 ease-in-out"
			>
				<div class="flex w-full flex-col">
					<span class="text-xs text-muted-foreground">Email Address</span>
					<!-- View mode (collapses when editing) -->
					<div
						class={[
							'grid transition-[grid-template-rows] duration-200 ease-in-out',
							isEditingEmail ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]',
							{ 'mt-1': !isEditingEmail }
						]}
						aria-hidden={isEditingEmail}
						inert={isEditingEmail}
					>
						<div class="overflow-hidden">
							<div class="flex items-center gap-2">
								<span class="truncate text-sm">{activeUser.email}</span>
								{#if activeUser.emailVerified}
									<span class="org-pill org-pill--ok">Verified</span>
								{:else}
									<span class="org-pill org-pill--warn">Not verified</span>
								{/if}
							</div>
						</div>
					</div>

					<!-- Edit mode (expands when editing) -->
					<div
						class={[
							'grid transition-[grid-template-rows] duration-200 ease-in-out',
							isEditingEmail ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
							{ 'mt-1': isEditingEmail }
						]}
						aria-hidden={!isEditingEmail}
						inert={!isEditingEmail}
					>
						<div class="overflow-hidden">
							<form onsubmit={handleSubmit} class="flex flex-col gap-3">
								<Input
									bind:ref={emailInputEl}
									type="email"
									class="w-full"
									bind:value={newEmail}
									placeholder="Enter new email address"
									required
									disabled={isSubmitting}
								/>
								<div class="mb-1 flex gap-1.5">
									<Button
										type="button"
										variant="secondary"
										size="sm"
										class="w-full"
										onclick={() => {
											newEmail = activeUser.email;
											isEditingEmail = false;
										}}
										disabled={isSubmitting}
									>
										Cancel
									</Button>
									<Button
										type="submit"
										size="sm"
										class="w-full"
										disabled={isSubmitting ||
											!newEmail ||
											newEmail.trim() === '' ||
											newEmail === activeUser.email}
									>
										{isSubmitting ? 'Verifying...' : 'Verify Email'}
									</Button>
								</div>
							</form>
						</div>
					</div>
				</div>
				<!-- Edit affordance and full-area overlay button in view mode -->
				{#if !isEditingEmail}
					<div class="shrink-0">
						<span
							class="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground"
							aria-hidden="true"
						>
							<PencilIcon class="size-4" />
						</span>
					</div>
					<button
						class="absolute inset-0 h-full w-full"
						aria-label="Change email"
						type="button"
						onclick={async () => {
							isEditingEmail = true;
							newEmail = activeUser.email;
							await tick();
							emailInputEl?.focus();
							emailInputEl?.select();
						}}
					></button>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
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
		color: color-mix(in oklch, var(--foreground) 18%, var(--muted-foreground));
	}
	.org-pill--ok {
		border-color: color-mix(in oklch, var(--foreground) 30%, transparent);
		color: var(--foreground);
	}
	.org-pill--warn {
		border-style: dashed;
	}
</style>
