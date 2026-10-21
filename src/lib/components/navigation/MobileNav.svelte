<script lang="ts">
	import * as Drawer from '$lib/ui/drawer';
	import { Separator } from '$lib/ui/separator';
	import MenuIcon from '@lucide/svelte/icons/menu';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	let open = $state(false);

	const navItems = [
		{ label: 'Services', href: '/services' },
		{ label: 'Posts', href: '/posts' },
		{ label: 'Games', href: '/games' }
	] as const;

	function isActive(href: string): boolean {
		const current = page.url.pathname;
		if (href === '/') return current === '/';
		return current.startsWith(href);
	}
</script>

<div class="flex md:hidden">
	<button class="mobile-nav-trigger" aria-label="Open navigation" onclick={() => (open = true)}>
		<MenuIcon size={18} />
	</button>
</div>

<Drawer.Root bind:open>
	<Drawer.Content>
		<div class="mx-auto w-full max-w-sm">
			<Drawer.Header>
				<Drawer.Title class="sr-only">Navigation</Drawer.Title>
			</Drawer.Header>

			<div class="flex flex-col gap-5 px-4 pb-8">
				<!-- Brand -->
				<a
					href={resolve('/')}
					class="text-xl font-bold tracking-[-0.02em]"
					style="color: var(--primary)"
					onclick={() => (open = false)}
				>
					feavel.com
				</a>

				<Separator />

				<!-- Main nav -->
				<nav class="flex flex-col gap-0.5">
					{#each navItems as item (item.href)}
						{@const active = isActive(item.href)}
						<a
							href={resolve(item.href)}
							class="flex items-center gap-3 rounded-md px-3 py-2.5 text-base font-medium transition-all"
							class:font-heading={active}
							class:font-semibold={active}
							style="color: {active ? 'var(--primary)' : 'var(--foreground)'}; opacity: {active
								? '1'
								: '0.7'}"
							onclick={() => (open = false)}
						>
							{#if active}
								<span
									class="h-5 w-1 rounded-full"
									style="background: var(--primary)"
									aria-hidden="true"
								></span>
							{/if}
							<span>{item.label}</span>
						</a>
					{/each}
				</nav>

				<Separator />

				<!-- Quick links -->
				<div class="flex flex-col gap-1">
					<span
						class="px-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
						>Quick links</span
					>
					<a
						href="/services#portfolio"
						class="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
						onclick={() => (open = false)}>Portfolio</a
					>
					<a
						href="/services#contact"
						class="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
						onclick={() => (open = false)}>Contact</a
					>
					<a
						href="/posts/editor"
						class="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
						onclick={() => (open = false)}>Post Editor</a
					>
				</div>
			</div>

			<Drawer.Footer>
				<Drawer.Close class="mobile-drawer-close">Close</Drawer.Close>
			</Drawer.Footer>
		</div>
	</Drawer.Content>
</Drawer.Root>

<style>
	.mobile-nav-trigger {
		display: inline-flex;
		align-items: center;
		color: var(--muted-foreground);
		opacity: 0.4;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		transition: opacity 0.2s;
	}
	.mobile-nav-trigger:hover {
		opacity: 0.7;
	}

	/* ponytail: :global — .mobile-drawer-close is on Drawer.Close (child component) */
	:global(.mobile-drawer-close) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 2.25rem;
		padding: 0 1.25rem;
		font-size: 0.6875rem;
		font-weight: 400;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--muted-foreground);
		background: transparent;
		border: 1px solid var(--border);
		cursor: pointer;
		transition:
			color 0.2s,
			border-color 0.2s;
	}
	:global(.mobile-drawer-close:hover) {
		color: var(--foreground);
		border-color: var(--muted-foreground);
	}
</style>
