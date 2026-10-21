<script lang="ts">
	// Svelte
	import { tick } from 'svelte';

	// API
	import { useQuery, useConvexClient, useMutation } from 'convex-svelte';
	import { useAuth } from '@mmailaender/convex-better-auth-svelte/svelte';
	import { getAuthContext } from '../../auth/context.svelte';
	const { api, authClient } = getAuthContext();
	const client = useConvexClient();
	const updateProfile = useMutation(api.users.mutations.updateProfile);

	// Icons
	import PencilIcon from '@lucide/svelte/icons/pencil';
	// Primitives
	import { toast } from 'svelte-sonner';
	import * as Avatar from '../../ui/avatar';
	import AvatarMarble from '../../ui/avatar/avatar-marble.svelte';
	import { Button } from '../../ui/button';
	import { Input } from '../../ui/input';
	import { Label } from '../../ui/label';
	import * as ImageCropper from '../../ui/image-cropper';
	import { getFileFromUrl } from '../../ui/image-cropper';

	// Utils
	import { optimizeImage } from '../../utils/optimizeImage';

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
	let isEditingName: boolean = $state(false);
	let name: string = $state('');
	let loadingStatus = $state<'loading' | 'loaded' | 'error'>('loading');
	let isUploading: boolean = $state(false);
	let cropSrc: string = $state('');

	let nameInputEl: HTMLInputElement | null = $state(null);

	let avatarKey: number = $state(0);

	// Initialize state when user data is available
	$effect(() => {
		if (activeUser && !isEditingName) {
			name = activeUser.name;
		}
	});

	// Keep crop preview in sync with current user image
	$effect(() => {
		if (activeUser?.image && !cropSrc.startsWith('blob:')) {
			cropSrc = activeUser.image;
		}
	});

	// Handle form submission to update profile
	async function handleSubmit(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		if (!activeUser) return;

		const trimmed = name.trim();

		try {
			if (!trimmed || trimmed === activeUser.name.trim()) {
				isEditingName = false;
				return;
			}
			name = trimmed;
			isEditingName = false;
			await updateProfile(
				{ name: trimmed },
				{
					optimisticUpdate: (store) => {
						const activeUser = store.getQuery(api.users.queries.getActiveUser, {});
						if (!activeUser) return;

						store.setQuery(
							api.users.queries.getActiveUser,
							{},
							{
								...activeUser,
								name: trimmed
							}
						);
					}
				}
			);
			toast.success('Profile name updated successfully');
		} catch (err: unknown) {
			const errorMsg = err instanceof Error ? err.message : 'An unknown error occurred';
			toast.error(`Failed to update profile: ${errorMsg}`);
		}
	}

	// Handle cropped image from ImageCropper
	async function handleCropped(url: string): Promise<void> {
		const previousImage = activeUser?.image ?? '';
		try {
			cropSrc = url;
			isUploading = true;
			// Convert cropped URL to File, then optimize and upload
			const croppedFile = await getFileFromUrl(url, 'avatar.png');
			const optimizedFile = await optimizeImage(croppedFile, {
				maxWidth: 512,
				maxHeight: 512,
				maxSizeKB: 500,
				quality: 0.85,
				format: 'webp',
				forceConvert: true
			});

			const { url: uploadUrl, key } = await client.mutation(api.r2.genUploadUrl, {
				prefix: 'avatars'
			});
			const response = await fetch(uploadUrl, {
				method: 'PUT',
				headers: { 'Content-Type': optimizedFile.type },
				body: optimizedFile
			});
			if (!response.ok) throw new Error('Failed to upload file');

			const imageUrl = `https://storage.feavel.com/${key}`;
			await authClient.updateUser({ image: imageUrl });

			loadingStatus = 'loaded';
			toast.success('Avatar updated successfully');
		} catch (err: unknown) {
			const errorMsg = err instanceof Error ? err.message : 'An unknown error occurred';
			toast.error(`Failed to upload avatar: ${errorMsg}`);
			cropSrc = previousImage;
			loadingStatus = 'error';
		} finally {
			isUploading = false;
		}
	}

	const displayedAvatarSrc = $derived(cropSrc || activeUser?.image || undefined);
	const showAvatarOverlay = $derived(
		!cropSrc.startsWith('blob:') && (isUploading || loadingStatus === 'loading')
	);
</script>

<div class="flex flex-col gap-4">
	{#if !activeUser}
		<div class="h-16 w-full animate-pulse rounded-md bg-muted"></div>
	{:else}
		<!-- Avatar + Upload via ImageCropper (rounded crop) -->
		<div class="flex items-center justify-start">
			<ImageCropper.Root bind:src={cropSrc} accept="image/*" onCropped={handleCropped}>
				<ImageCropper.UploadTrigger>
					<div class="relative size-16 cursor-pointer rounded-lg transition-all duration-200">
						<div class="relative cursor-pointer transition-colors">
							{#key avatarKey}
								<Avatar.Root
									class="size-16"
									onLoadingStatusChange={(status) => (loadingStatus = status)}
								>
									<Avatar.Image src={displayedAvatarSrc} alt={activeUser.name} />
									<Avatar.Fallback
										class="rounded-lg bg-secondary duration-150 ease-in-out hover:bg-accent"
									>
										<AvatarMarble name={activeUser.name} />
									</Avatar.Fallback>
								</Avatar.Root>
							{/key}

							{#if showAvatarOverlay}
								<div
									class="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-background"
								>
									<div
										class="h-6 w-6 animate-spin rounded-full border-2 border-white border-b-transparent"
									></div>
								</div>
							{/if}

							<div
								class="absolute -right-1.5 -bottom-1.5 flex size-3 items-center justify-center rounded-full bg-secondary ring-4 ring-background hover:bg-accent"
							>
								<PencilIcon class="size-4" />
							</div>
						</div>
					</div>
				</ImageCropper.UploadTrigger>
				<ImageCropper.Dialog>
					<ImageCropper.Cropper cropShape="round" />
					<ImageCropper.Controls>
						<ImageCropper.Cancel />
						<ImageCropper.Crop>Upload</ImageCropper.Crop>
					</ImageCropper.Controls>
				</ImageCropper.Dialog>
			</ImageCropper.Root>
		</div>

		<!-- Inline editable name -->
		<div
			class={[
				'relative w-full rounded-lg border border-border transition-all duration-200 ease-in-out',
				{
					'cursor-pointer': !isEditingName,
					'hover:bg-accent': !isEditingName,
					'hover:border-border': !isEditingName
				}
			]}
		>
			<div
				class="flex items-center justify-between gap-3 px-3 py-1.5 transition-all duration-200 ease-in-out"
			>
				<div class="flex w-full flex-col">
					<Label for="profile-name" class="text-xs text-muted-foreground">Name</Label>
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
							<span class="truncate text-sm">{activeUser.name}</span>
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
							<form onsubmit={handleSubmit} class="flex w-full flex-col gap-3">
								<Input
									bind:ref={nameInputEl}
									id="profile-name"
									type="text"
									class="w-full"
									bind:value={name}
								/>
								<div class="mb-1 flex gap-1.5">
									<Button
										type="button"
										variant="secondary"
										size="sm"
										class="w-full"
										onclick={() => {
											name = activeUser.name;
											isEditingName = false;
										}}
									>
										Cancel
									</Button>
									<Button
										type="submit"
										size="sm"
										class="w-full"
										disabled={!name || name.trim() === '' || name.trim() === activeUser.name.trim()}
									>
										Save
									</Button>
								</div>
							</form>
						</div>
					</div>
				</div>
				<!-- Edit affordance and full-area overlay button in view mode -->
				{#if !isEditingName}
					<div>
						<Button
							variant="ghost"
							size="icon"
							tabindex={-1}
							aria-hidden="true"
							class="pointer-events-none"
						>
							<PencilIcon class="size-4" />
						</Button>
					</div>
					<button
						class="absolute inset-0 h-full w-full"
						aria-label="Edit name"
						type="button"
						onclick={async () => {
							isEditingName = true;
							name = activeUser.name;
							await tick();
							nameInputEl?.focus();
							nameInputEl?.select();
						}}
					></button>
				{/if}
			</div>
		</div>
	{/if}
</div>
