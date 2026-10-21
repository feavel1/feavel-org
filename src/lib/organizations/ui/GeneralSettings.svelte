<script lang="ts">
	// Svelte
	import { tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	// UI Components
	// Icons
	import Building2Icon from '@lucide/svelte/icons/building-2';
	import PencilIcon from '@lucide/svelte/icons/pencil';

	// Primitives
	import { toast } from 'svelte-sonner';
	import { Button } from '../../ui/button';
	import { Input } from '../../ui/input';
	import * as Avatar from '../../ui/avatar';
	import * as ImageCropper from '../../ui/image-cropper';
	import { getFileFromUrl } from '../../ui/image-cropper';

	// Utils
	import { optimizeImage } from '../../utils/optimizeImage';

	// API
	import { useQuery, useConvexClient, useMutation } from 'convex-svelte';
	import { ConvexError } from 'convex/values';
	import { useRoles } from '../api/roles.svelte';
	import { useAuth } from '@mmailaender/convex-better-auth-svelte/svelte';
	import { getAuthContext } from '../../auth/context.svelte';
	const { api } = getAuthContext();

	// Types
	import type { Path } from '$app/types';
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

	const client = useConvexClient();
	const updateOrganization = useMutation(api.organizations.mutations.updateOrganizationProfile);
	const roles = useRoles({}, () => ({
		initialData: initialData?.role
	}));
	const isOwnerOrAdmin = $derived(roles.hasOwnerOrAdminRole);

	// Queries
	const userResponse = useQuery(
		api.users.queries.getActiveUser,
		() => (auth.isAuthenticated ? {} : 'skip'),
		() => ({ initialData: initialData?.activeUser })
	);

	const organizationResponse = useQuery(
		api.organizations.queries.getActiveOrganization,
		() => (auth.isAuthenticated ? {} : 'skip'),
		() => ({ initialData: initialData?.activeOrganization })
	);
	const user = $derived(userResponse?.data);
	const activeOrganization = $derived(organizationResponse?.data);

	// Avatar State
	let imageLoadingStatus: 'loading' | 'loaded' | 'error' = $state('loaded');
	let isUploading: boolean = $state(false);
	let logoKey: number = $state(0);
	let cropSrc: string = $state('');

	// Inline name editing state
	let isEditingName: boolean = $state(false);
	let name: string = $state('');
	let nameInputEl = $state<HTMLInputElement | null>(null);

	// Inline slug editing state
	let isEditingSlug: boolean = $state(false);
	let slug: string = $state('');
	let isSavingSlug: boolean = $state(false);
	let slugInputEl = $state<HTMLInputElement | null>(null);

	// Initialize state when organization data is available
	$effect(() => {
		if (activeOrganization) {
			if (!isEditingName) {
				name = activeOrganization.name;
			}
			if (!isEditingSlug) {
				slug = activeOrganization.slug || '';
			}
		}
	});

	// Keep crop preview in sync with org logo
	$effect(() => {
		if (activeOrganization?.logo && !cropSrc.startsWith('blob:')) {
			cropSrc = activeOrganization.logo;
		}
	});

	// Handlers

	async function handleCropped(url: string): Promise<void> {
		if (!activeOrganization) return;
		const previousLogo = activeOrganization.logo ?? '';
		try {
			cropSrc = url;
			isUploading = true;
			const croppedFile = await getFileFromUrl(url, 'logo.png');
			const optimizedFile = await optimizeImage(croppedFile, {
				maxWidth: 512,
				maxHeight: 512,
				maxSizeKB: 500,
				quality: 0.85,
				format: 'webp',
				forceConvert: true
			});

			const { url: uploadUrl, key } = await client.mutation(api.r2.genUploadUrl, {
				prefix: 'logos'
			});
			const response = await fetch(uploadUrl, {
				method: 'PUT',
				headers: { 'Content-Type': optimizedFile.type },
				body: optimizedFile
			});
			if (!response.ok) throw new Error('Failed to upload file');

			await updateOrganization({ logoUrl: `https://storage.feavel.com/${key}` });

			imageLoadingStatus = 'loaded';
			toast.success('Organization logo updated successfully');
		} catch (err) {
			const message = err instanceof Error ? err.message : 'An unknown error occurred';
			toast.error(`Failed to update logo: ${message}`);
			cropSrc = previousLogo;
			imageLoadingStatus = 'error';
		} finally {
			isUploading = false;
		}
	}

	const displayedLogoSrc = $derived(cropSrc || activeOrganization?.logo || undefined);
	const showLogoOverlay = $derived(
		!cropSrc.startsWith('blob:') &&
			(isUploading || (imageLoadingStatus as 'loading' | 'loaded' | 'error') === 'loading')
	);

	async function handleNameSubmit(e: SubmitEvent): Promise<void> {
		e.preventDefault();
		if (!activeOrganization) return;

		const trimmed = name.trim();

		try {
			if (!trimmed || trimmed === activeOrganization.name.trim()) {
				isEditingName = false;
				return;
			}
			name = trimmed;
			isEditingName = false;
			await updateOrganization(
				{ name: trimmed },
				{
					optimisticUpdate: (store) => {
						const activeOrganization = store.getQuery(
							api.organizations.queries.getActiveOrganization,
							{}
						);
						if (!activeOrganization) return;

						store.setQuery(
							api.organizations.queries.getActiveOrganization,
							{},
							{
								...activeOrganization,
								name: trimmed
							}
						);

						const organizations = store.getQuery(api.organizations.queries.listOrganizations, {});
						if (organizations !== undefined) {
							store.setQuery(
								api.organizations.queries.listOrganizations,
								{},
								organizations.map((organization) =>
									organization.id === activeOrganization.id
										? { ...organization, name: trimmed }
										: organization
								)
							);
						}
					}
				}
			);
			toast.success('Organization name updated successfully');
		} catch (err) {
			const message =
				err instanceof ConvexError
					? err.data
					: err instanceof Error
						? err.message
						: 'An unknown error occurred';
			toast.error(`Failed to update organization: ${message}`);
		}
	}

	async function handleSlugSubmit(e: SubmitEvent): Promise<void> {
		e.preventDefault();
		if (!activeOrganization || isSavingSlug) return;

		try {
			const trimmed = slug.trim();
			const currentSlug = activeOrganization.slug || '';
			if (trimmed === '' || trimmed === currentSlug) {
				isEditingSlug = false;
				return;
			}
			isSavingSlug = true;

			// Update slug
			await updateOrganization({ slug: trimmed });

			// If current URL contains the old slug, replace it with the new slug
			const currentPathname = page.url.pathname;
			const urlContainsCurrentSlug =
				currentSlug &&
				(currentPathname.includes(`/${currentSlug}/`) ||
					currentPathname.endsWith(`/${currentSlug}`));

			if (urlContainsCurrentSlug) {
				const newPathname = currentPathname.replace(
					new RegExp(`/${currentSlug}(?=/|$)`, 'g'),
					`/${trimmed}`
				);

				await goto(resolve(newPathname as Path), { replaceState: true });
			}

			isEditingSlug = false;
			toast.success('Organization slug updated successfully');
		} catch (err) {
			const message =
				err instanceof ConvexError
					? err.data
					: err instanceof Error
						? err.message
						: 'An unknown error occurred';
			toast.error(`Failed to update organization: ${message}`);
		} finally {
			isSavingSlug = false;
		}
	}
</script>

{#if user && activeOrganization}
	<div class="flex w-full flex-col items-start gap-6">
		<ImageCropper.Root bind:src={cropSrc} accept="image/*" onCropped={handleCropped}>
			<ImageCropper.UploadTrigger>
				<div class="org-logo relative cursor-pointer">
					{#key logoKey}
						<Avatar.Root
							class="org-logo-frame size-20"
							onLoadingStatusChange={(status: 'loading' | 'loaded' | 'error') =>
								(imageLoadingStatus = status)}
						>
							<Avatar.Image
								src={displayedLogoSrc}
								alt={activeOrganization.name || 'Organization'}
							/>
							<Avatar.Fallback class="org-logo-fallback size-20">
								<Building2Icon class="size-8" />
							</Avatar.Fallback>
						</Avatar.Root>
					{/key}

					{#if showLogoOverlay}
						<div
							class="org-logo-overlay pointer-events-none absolute inset-0 flex items-center justify-center"
						>
							<div class="org-spinner"></div>
						</div>
					{/if}

					<div
						class="org-logo-edit absolute right-0 bottom-0 flex size-5 items-center justify-center"
					>
						<PencilIcon class="size-3" />
					</div>
				</div>
			</ImageCropper.UploadTrigger>
			<ImageCropper.Dialog>
				<ImageCropper.Cropper cropShape="rect" />
				<ImageCropper.Controls>
					<ImageCropper.Cancel />
					<ImageCropper.Crop>Upload</ImageCropper.Crop>
				</ImageCropper.Controls>
			</ImageCropper.Dialog>
		</ImageCropper.Root>

		<!-- Inline editable organization name -->
		<div class="flex w-full flex-col gap-3">
			<div
				class={[
					'org-field relative w-full',
					{ 'org-field--editable': isOwnerOrAdmin && !isEditingName }
				]}
			>
				<div
					class="flex items-center justify-between gap-3 transition-all duration-200 ease-in-out"
				>
					<div class="flex w-full flex-col gap-0">
						<span class="org-field-label">Organization name</span>
						<!-- View mode (collapses when editing) -->
						<div
							class={[
								'grid transition-[grid-template-rows] duration-200 ease-in-out',
								isEditingName ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]',
								{ 'mt-1': !isEditingName }
							]}
							aria-hidden={isEditingName}
							inert={isEditingName}
						>
							<div class="overflow-hidden">
								<span class="org-field-value truncate">{activeOrganization.name}</span>
							</div>
						</div>

						<!-- Edit mode (expands when editing) -->
						<div
							class={[
								'grid transition-[grid-template-rows] duration-200 ease-in-out',
								isEditingName ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
								{ 'mt-1': isEditingName }
							]}
							aria-hidden={!isEditingName}
							inert={!isEditingName}
						>
							<div class="overflow-hidden">
								<form onsubmit={handleNameSubmit} class="flex w-full flex-col gap-3">
									<Input ref={nameInputEl} type="text" bind:value={name} />
									<div class="mb-1 flex gap-1.5">
										<Button
											type="button"
											variant="secondary"
											size="sm"
											class="w-full"
											onclick={() => {
												name = activeOrganization.name;
												isEditingName = false;
											}}
										>
											Cancel
										</Button>
										<Button
											type="submit"
											size="sm"
											class="w-full"
											disabled={!name ||
												name.trim() === '' ||
												name.trim() === activeOrganization.name.trim()}
										>
											Save
										</Button>
									</div>
								</form>
							</div>
						</div>
					</div>
					<!-- Edit affordance and full-area overlay button in view mode -->
					{#if isOwnerOrAdmin && !isEditingName}
						<div class="shrink-0">
							<Button
								variant="ghost"
								size="icon"
								tabindex={-1}
								class="pointer-events-none"
								aria-hidden="true"
							>
								<PencilIcon class="size-4" />
							</Button>
						</div>
						<button
							class="absolute inset-0 h-full w-full"
							aria-label="Edit organization name"
							type="button"
							onclick={async () => {
								isEditingName = true;
								name = activeOrganization.name;
								await tick();
								nameInputEl?.focus();
								nameInputEl?.select();
							}}
						></button>
					{/if}
				</div>
			</div>

			<!-- Inline editable organization slug -->
			<div
				class={[
					'org-field relative w-full',
					{ 'org-field--editable': isOwnerOrAdmin && !isEditingSlug }
				]}
			>
				<div
					class="flex items-center justify-between gap-3 transition-all duration-200 ease-in-out"
				>
					<div class="flex w-full flex-col gap-0">
						<span class="org-field-label">Slug</span>
						<!-- View mode (collapses when editing) -->
						<div
							class={[
								'grid transition-[grid-template-rows] duration-200 ease-in-out',
								isEditingSlug ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]',
								{ 'mt-1': !isEditingSlug }
							]}
							aria-hidden={isEditingSlug}
							inert={isEditingSlug}
						>
							<div class="overflow-hidden">
								<span class="org-field-value org-field-value--slug truncate"
									>{activeOrganization.slug}</span
								>
							</div>
						</div>

						<!-- Edit mode (expands when editing) -->
						<div
							class={[
								'grid transition-[grid-template-rows] duration-200 ease-in-out',
								isEditingSlug ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
								{ 'mt-1': isEditingSlug }
							]}
							aria-hidden={!isEditingSlug}
							inert={!isEditingSlug}
						>
							<div class="overflow-hidden">
								<form onsubmit={handleSlugSubmit} class="flex w-full flex-col gap-3">
									<Input ref={slugInputEl} type="text" bind:value={slug} disabled={isSavingSlug} />
									<div class="mb-1 flex gap-1.5">
										<Button
											type="button"
											variant="secondary"
											size="sm"
											class="w-full"
											disabled={isSavingSlug}
											onclick={() => {
												slug = activeOrganization.slug || '';
												isEditingSlug = false;
											}}
										>
											Cancel
										</Button>
										<Button
											type="submit"
											size="sm"
											class="w-full"
											disabled={isSavingSlug ||
												!slug ||
												slug.trim() === '' ||
												slug.trim() === (activeOrganization.slug || '').trim()}
										>
											{isSavingSlug ? 'Saving...' : 'Save'}
										</Button>
									</div>
								</form>
							</div>
						</div>
					</div>
					{#if isOwnerOrAdmin && !isEditingSlug}
						<div class="shrink-0">
							<Button
								variant="ghost"
								size="icon"
								tabindex={-1}
								class="pointer-events-none"
								aria-hidden="true"
							>
								<PencilIcon class="size-4" />
							</Button>
						</div>
						<button
							class="absolute inset-0 h-full w-full"
							aria-label="Edit organization slug"
							type="button"
							onclick={async () => {
								isEditingSlug = true;
								slug = activeOrganization.slug || '';
								await tick();
								slugInputEl?.focus();
								slugInputEl?.select();
							}}
						></button>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	/* ── Logo mark ────────────────────────────────────────────────────────────
	   Square, hairline, zero radius — the same mark language as the switcher. */
	.org-logo {
		display: inline-flex;
	}

	:global(.org-logo-frame) {
		border: 1px solid color-mix(in oklch, var(--foreground) 16%, transparent);
		border-radius: 0;
		overflow: hidden;
		background: color-mix(in oklch, var(--foreground) 4%, var(--popover));
	}
	:global(.org-logo-frame img) {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	:global(.org-logo-fallback) {
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 0;
		background: transparent;
		color: color-mix(in oklch, var(--foreground) 18%, var(--muted-foreground));
		transition: color 0.18s ease;
	}
	.org-logo:hover :global(.org-logo-fallback) {
		color: var(--foreground);
	}

	.org-logo-overlay {
		background: color-mix(in oklch, var(--popover) 72%, transparent);
	}

	.org-spinner {
		width: 1.125rem;
		height: 1.125rem;
		border: 1.5px solid color-mix(in oklch, var(--foreground) 20%, transparent);
		border-bottom-color: var(--foreground);
		border-radius: 50%;
		animation: org-spin 0.7s linear infinite;
	}
	@keyframes org-spin {
		to {
			transform: rotate(360deg);
		}
	}

	.org-logo-edit {
		border: 1px solid color-mix(in oklch, var(--foreground) 16%, transparent);
		border-radius: 0;
		background: var(--popover);
		color: color-mix(in oklch, var(--foreground) 18%, var(--muted-foreground));
	}

	/* ── Editable fields ──────────────────────────────────────────────────────
	   One hairline rule per field, no nested cards. The whole row is the target. */
	.org-field {
		padding: 0.5rem 0.75rem 0.5625rem;
		border: 1px solid color-mix(in oklch, var(--border) 70%, transparent);
		border-radius: 0;
		background: transparent;
		transition:
			border-color 0.18s ease,
			background-color 0.18s ease;
	}
	.org-field--editable {
		cursor: pointer;
	}
	.org-field--editable:hover {
		border-color: color-mix(in oklch, var(--foreground) 22%, transparent);
		background: color-mix(in oklch, var(--foreground) 3%, transparent);
	}
	.org-field:focus-within {
		border-color: color-mix(in oklch, var(--foreground) 28%, transparent);
	}

	.org-field-label {
		font-size: 0.5625rem;
		font-weight: 400;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: color-mix(in oklch, var(--foreground) 18%, var(--muted-foreground));
	}

	.org-field-value {
		display: block;
		font-size: 0.875rem;
		line-height: 1.35;
		color: var(--foreground);
	}
	.org-field-value--slug {
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.01em;
	}

	@media (prefers-reduced-motion: reduce) {
		.org-field,
		:global(.org-logo-fallback) {
			transition: none;
		}
		.org-spinner {
			animation-duration: 2s;
		}
	}
</style>
