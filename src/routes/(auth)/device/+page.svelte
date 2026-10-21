<script lang="ts">
	import { onMount } from 'svelte';
	import { authClient } from '#lib/auth/api/auth-client.js';
	import { page } from '$app/state';
	import { AUTH_CONSTANTS } from '#convex/auth.constants.js';
	import { Button } from '#lib/ui/button/index.js';

	let userCode: string = $state('');
	let verifyLoading = $state(true);
	let verifyError: string | null = $state(null);
	let verified = $state(false);

	let actionLoading: 'approve' | 'deny' | null = $state(null);
	let actionError: string | null = $state(null);
	let actionDone: 'approved' | 'denied' | null = $state(null);

	onMount(async () => {
		if (!AUTH_CONSTANTS.deviceAuthorization) {
			return;
		}

		userCode = page.url.searchParams.get('user_code') ?? '';
		if (!userCode) {
			verifyError = 'Missing code';
			return;
		}

		verifyLoading = true;

		const response = await authClient.device({
			query: { user_code: userCode }
		});

		if (response.error) {
			verifyError = response.error.error_description;
		} else {
			verified = true;
		}

		verifyLoading = false;
	});

	async function handleApprove() {
		actionError = null;
		actionLoading = 'approve';
		const { error } = await authClient.device.approve({ userCode });
		if (error) {
			actionError = error.error_description;
			return;
		} else {
			actionDone = 'approved';
		}
		actionLoading = null;
	}

	async function handleDeny() {
		actionError = null;
		actionLoading = 'deny';
		const { error } = await authClient.device.deny({ userCode });
		if (error) {
			actionError = error.error_description;
			return;
		} else {
			actionDone = 'denied';
		}
		actionLoading = null;
	}
</script>

<section class="mx-auto max-w-lg p-6">
	<h1 class="mb-4 text-2xl font-semibold">Authorize Device</h1>

	{#if AUTH_CONSTANTS.deviceAuthorization}
		{#if verifyLoading}
			<p class="opacity-80">Verifying your code…</p>
		{:else if verifyError}
			<div class="mb-4 rounded-md bg-destructive/10 p-3 text-destructive">
				<p>{verifyError}</p>
			</div>
			<p class="text-sm opacity-80">
				Check that you opened this page from the device and that the URL contains a valid code.
			</p>
		{:else if actionDone === 'approved'}
			<div class="mb-4 rounded-md bg-green-500/10 p-3 text-green-600 dark:text-green-400">
				<p>Success! You approved the request.</p>
			</div>
			<p class="opacity-80">
				You can return to the device now. The device should connect automatically.
			</p>
		{:else if actionDone === 'denied'}
			<div class="mb-4 rounded-md bg-amber-500/10 p-3 text-amber-600 dark:text-amber-400">
				<p>Request denied.</p>
			</div>
			<p class="opacity-80">You can close this window.</p>
		{:else if verified}
			<p class="mb-6 opacity-80">Do you want to sign in on your device?</p>

			{#if actionError}
				<div class="mb-4 rounded-md bg-destructive/10 p-3 text-destructive">
					<p>{actionError}</p>
				</div>
			{/if}

			<div class="flex justify-end gap-3">
				<Button variant="secondary" onclick={handleDeny} disabled={!!actionLoading}>
					{actionLoading === 'deny' ? 'Denying…' : 'Deny'}
				</Button>
				<Button onclick={handleApprove} disabled={!!actionLoading}>
					{actionLoading === 'approve' ? 'Approving…' : 'Approve'}
				</Button>
			</div>
		{/if}
	{:else}
		<p class="opacity-80">Device authorization is not enabled.</p>
	{/if}
</section>
