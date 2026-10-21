<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';

	const groups: Array<{
		label: string;
		href: string;
		items: Array<{ label: string; href: string; description?: string }>;
	}> = [
		{
			label: 'Posts',
			href: resolve('/posts'),
			items: [
				{ label: 'Browse', href: resolve('/posts'), description: 'Public posts reader' },
				{ label: 'Editor', href: resolve('/posts/editor'), description: 'Rich-text editor' }
			]
		},
		{
			label: 'Games',
			href: resolve('/games'),
			items: [
				{ label: 'Tic-Tac-Toe', href: resolve('/games/tic-tac-toe'), description: 'Hot-seat' },
				{ label: 'Chess', href: resolve('/games/chess'), description: 'Two-player' }
			]
		},
		{
			label: 'Services',
			href: resolve('/services'),
			items: [
				{ label: 'What I do', href: resolve('/services'), description: 'List of services' },
				{ label: 'Portfolio', href: resolve('/services#portfolio'), description: 'Selected work' },
				{ label: 'About', href: resolve('/services#about'), description: 'Background' },
				{ label: 'Contact', href: resolve('/services#contact'), description: 'Get in touch' }
			]
		}
	];

	// Precompute all active states at top level — never read reactive state inside {#if} blocks.
	const items = $derived(
		groups.map((g) => ({
			...g,
			active: page.url.pathname.startsWith(g.href),
			items: g.items.map((item) => ({
				...item,
				active: page.url.pathname.startsWith(item.href)
			}))
		}))
	);

	let openIndex: number | null = $state(null);
	let leavingTimer: ReturnType<typeof setTimeout> | null = null;

	function onEnter(i: number) {
		if (leavingTimer) {
			clearTimeout(leavingTimer);
			leavingTimer = null;
		}
		openIndex = i;
	}

	function onLeave() {
		leavingTimer = setTimeout(() => {
			openIndex = null;
		}, 150);
	}

	function close() {
		if (leavingTimer) {
			clearTimeout(leavingTimer);
			leavingTimer = null;
		}
		openIndex = null;
	}
</script>

{#snippet chevron()}
	<ChevronDown
		class="ml-1 size-3 transition-transform group-data-[open]:rotate-180"
		aria-hidden="true"
	/>
{/snippet}

<nav class="hidden gap-0 md:flex">
	{#each items as group, i (group.href)}
		<div
			role="menubar"
			tabindex="0"
			class="group relative"
			data-open={openIndex === i ? '' : undefined}
			onmouseenter={() => onEnter(i)}
			onmouseleave={onLeave}
		>
			<button
				type="button"
				class={[
					'rounded-lg px-2.5 py-1.5 text-xs/relaxed font-medium hover:bg-muted focus:bg-muted',
					'transition-all focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-1',
					'inline-flex h-9 w-max items-center justify-center outline-none',
					group.active ? 'underline' : ''
				].join(' ')}
				aria-expanded={openIndex === i}
			>
				{group.label}
				{@render chevron()}
			</button>

			{#if openIndex === i}
				<div
					class="absolute start-0 top-full z-50 mt-1.5 w-[220px] rounded-xl bg-popover p-2
						text-popover-foreground shadow-md ring-1 ring-foreground/10"
				>
					<ul class="grid gap-1" role="menu">
						{#each group.items as item (item.href)}
							<li role="none">
								<a
									href={item.href}
									onclick={close}
									role="menuitem"
									class={[
										'flex flex-col gap-0.5 rounded-md p-2 text-xs/relaxed transition-all outline-none',
										'hover:bg-muted focus:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30',
										item.active ? 'bg-accent font-medium text-accent-foreground' : ''
									].join(' ')}
								>
									<span class="text-sm font-medium">{item.label}</span>
									{#if item.description}
										<span class="text-xs text-muted-foreground">{item.description}</span>
									{/if}
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>
	{/each}
</nav>
