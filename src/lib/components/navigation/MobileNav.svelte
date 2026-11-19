<script lang="ts">
	import * as Drawer from '#lib/ui/drawer';
	import { Separator } from '#lib/ui/separator';
	import MenuIcon from '@lucide/svelte/icons/menu';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { navLinks, type ResolvedHref } from './nav-links.js';
	import { m } from '#lib/paraglide/messages.js';

	let open = $state(false);

	// Secondary destinations — not in the main row, but reachable in one tap.
	// `href` is a resolved route plus a hash, which widens the type to string.
	const quickLinks = $derived<{ href: string; label: string }[]>([
		{ href: `${resolve('/services')}#portfolio`, label: m.nav_portfolio() },
		{ href: `${resolve('/services')}#contact`, label: m.nav_contact() },
		{ href: resolve('/posts/editor'), label: m.nav_post_editor() }
	]);

	function isActive(href: string): boolean {
		const current = page.url.pathname;
		if (href === '/') return current === '/';
		return current.startsWith(href);
	}
</script>

<div class="flex">
	<button
		type="button"
		class="nav-util nav-util-icon md:hidden"
		aria-label={m.nav_open_navigation()}
		onclick={() => (open = true)}
	>
		<MenuIcon size={18} />
	</button>
</div>

<Drawer.Root bind:open>
	<Drawer.Content>
		<div class="mx-auto w-full max-w-sm">
			<Drawer.Header>
				<Drawer.Title class="sr-only">{m.nav_navigation()}</Drawer.Title>
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
					{#each navLinks as item (item.href)}
						{@const active = isActive(item.href)}
						<a
							href={item.href as ResolvedHref}
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
							<span>{item.label()}</span>
						</a>
					{/each}
				</nav>

				<Separator />

				<!-- Quick links -->
				<div class="flex flex-col gap-1">
					<span
						class="px-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
						>{m.nav_quick_links()}</span
					>
					{#each quickLinks as link (link.href)}
						<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- resolved route + hash -->
						<a href={link.href} class="quick-link" onclick={() => (open = false)}>{link.label}</a>
					{/each}
				</div>
			</div>

			<Drawer.Footer>
				<Drawer.Close class="mobile-drawer-close">{m.nav_close()}</Drawer.Close>
			</Drawer.Footer>
		</div>
	</Drawer.Content>
</Drawer.Root>

<style>
	.quick-link {
		border-radius: 0;
		padding: 0.5rem 0.75rem;
		font-size: 0.875rem;
		color: var(--muted-foreground);
		transition: color 0.2s;
	}
	.quick-link:hover {
		color: var(--foreground);
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
