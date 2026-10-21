<script lang="ts">
	// Svelte
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	// Primitives
	import * as Dialog from '../../ui/dialog';
	// Components
	import UserProfile from './UserProfile.svelte';
	// Utils
	import { isEditableElement, scheduleScrollIntoView } from '../../utils/focusScroll';

	// Constants
	import { DIALOG_KEY } from '../utils/user.constants';

	// API
	import { useAuth } from '@mmailaender/convex-better-auth-svelte/svelte';

	// Types
	import type { Path } from '$app/types';
	import type { GetActiveUserType, ListAccountsType } from '../../auth/types';

	type UserProfileHostProps = {
		initialData?: {
			activeUser?: GetActiveUserType;
			accountList?: ListAccountsType;
		};
	};

	let { initialData }: UserProfileHostProps = $props();

	// Auth
	const auth = useAuth();
	const isAuthenticated = $derived(auth.isAuthenticated);

	// Local dialog state (formerly from singleton)
	let userProfile = $state({
		open: false,
		suppressTransition: false
	});

	// iOS / gesture guards
	let isIOS = $state(false);
	let backSwipeGuard = $state(false);
	let guardTimer: ReturnType<typeof setTimeout> | null = null;
	let prevShouldBeOpen = false;
	let suppressDialogRender = $state(false);
	let internalCloseGuard = $state(false);
	let internalCloseTimer: ReturnType<typeof setTimeout> | null = null;

	onMount(() => {
		// Detect iOS/iPadOS (including iPadOS 13+ which reports as Macintosh)
		const ua = navigator.userAgent;

		isIOS =
			/iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);

		// Hydrate once from the URL so deep-links open at load
		const shouldBeOpen = page.url.searchParams.get('dialog') === DIALOG_KEY;
		userProfile.open = shouldBeOpen;
		prevShouldBeOpen = shouldBeOpen;

		const onPopState = () => {
			if (!isIOS) return;
			const url = new URL(window.location.href);
			const shouldBeOpenNow = url.searchParams.get('dialog') === DIALOG_KEY;
			const closingCandidate = prevShouldBeOpen && !shouldBeOpenNow;
			if (closingCandidate) {
				backSwipeGuard = true;
				if (guardTimer) clearTimeout(guardTimer);
				guardTimer = setTimeout(() => {
					backSwipeGuard = false;
					guardTimer = null;
				}, 650);
			}
		};
		window.addEventListener('popstate', onPopState);
		return () => window.removeEventListener('popstate', onPopState);
	});

	onMount(() => {
		const handleClose = () => closeProfileModal();
		window.addEventListener('user-profile:close', handleClose);
		return () => window.removeEventListener('user-profile:close', handleClose);
	});

	// URL → state sync
	$effect(() => {
		const shouldBeOpen = page.url.searchParams.get('dialog') === DIALOG_KEY;
		const closingCandidate = prevShouldBeOpen && !shouldBeOpen;

		if (isIOS && closingCandidate && !backSwipeGuard && !internalCloseGuard) {
			backSwipeGuard = true;
			if (guardTimer) clearTimeout(guardTimer);
			guardTimer = setTimeout(() => {
				backSwipeGuard = false;
				guardTimer = null;
			}, 650);
		}

		const closingFromUrl = closingCandidate && backSwipeGuard;

		suppressDialogRender = !!closingFromUrl;
		userProfile.open = closingFromUrl ? false : shouldBeOpen;
		prevShouldBeOpen = shouldBeOpen;
	});

	// Transition guard
	$effect(() => {
		if (backSwipeGuard) {
			userProfile.suppressTransition = true;
		} else if (userProfile.suppressTransition) {
			setTimeout(() => (userProfile.suppressTransition = false), 100);
		}
	});

	function closeProfileModal() {
		// Mark programmatic close so we don't arm back-swipe guard from URL-driven close
		internalCloseGuard = true;
		if (internalCloseTimer) clearTimeout(internalCloseTimer);
		internalCloseTimer = setTimeout(() => {
			internalCloseGuard = false;
			internalCloseTimer = null;
		}, 500);

		const hasDialog = page.url.searchParams.get('dialog') === DIALOG_KEY;
		if (hasDialog) {
			const url = new URL(page.url.href);
			url.searchParams.delete('dialog');
			void goto(resolve(`${url.pathname}${url.search}${url.hash}` as Path), {
				replaceState: true,
				reset: false
			});
		}
		userProfile.open = false;
	}
</script>

{#if isAuthenticated && !suppressDialogRender}
	<Dialog.Root
		bind:open={userProfile.open}
		onOpenChange={(open) => {
			if (!open) closeProfileModal();
		}}
	>
		<Dialog.Content
			class={`top-0 left-0 h-full max-h-[100dvh] w-full max-w-full translate-x-0 translate-y-0 rounded-none p-0 sm:max-w-none md:top-1/2 md:left-1/2 md:h-auto md:max-h-[90vh] md:w-[480px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-none ${userProfile.suppressTransition ? 'animate-none transition-none duration-0 data-[state=closed]:duration-0 data-[state=open]:duration-0' : ''}`}
		>
			<div
				class="flex max-h-[100dvh] w-full flex-col overflow-auto overscroll-contain md:max-h-[90vh]"
				onfocusin={(e) => {
					const el = e.target as HTMLElement | null;
					if (!el) return;
					if (!isEditableElement(el)) return;
					scheduleScrollIntoView(el);
				}}
			>
				<Dialog.Header class="px-5 pt-5 pr-14 pb-0">
					<Dialog.Title>Profile</Dialog.Title>
				</Dialog.Header>
				<div class="p-5">
					<UserProfile {initialData} />
				</div>
			</div>
		</Dialog.Content>
	</Dialog.Root>
{/if}
