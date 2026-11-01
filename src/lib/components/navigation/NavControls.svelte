<script lang="ts">
	import * as DropdownMenu from '#lib/ui/dropdown-menu';
	import { locales, setLocale, getLocale } from '#lib/paraglide/runtime';
	import { mode, setMode, resetMode } from 'mode-watcher';
	import { Sun, Moon, Monitor, Check, Languages } from '@lucide/svelte';

	type ThemeMode = 'light' | 'dark' | 'system';

	const localeLabels: Record<string, string> = {
		en: 'English',
		ru: 'Русский',
		cn: '中文'
	};

	const themeModes: { label: string; value: ThemeMode; icon: typeof Sun }[] = [
		{ label: 'Light', value: 'light', icon: Sun },
		{ label: 'Dark', value: 'dark', icon: Moon },
		{ label: 'System', value: 'system', icon: Monitor }
	];

	const currentMode = $derived<ThemeMode>((mode.current as ThemeMode) ?? 'system');
	const currentLocale = $derived(getLocale());

	function applyTheme(next: ThemeMode) {
		if (next === 'system') resetMode();
		else setMode(next);
	}

	// No `reload: false`: the active strategy is cookie-based, so the new locale
	// only reaches the server (and therefore the rendered messages) on a document
	// load. Letting setLocale() do its default reload is the whole mechanism.
	function applyLocale(next: (typeof locales)[number]) {
		void setLocale(next);
	}
</script>

<!-- Theme -->
<DropdownMenu.Root>
	<DropdownMenu.Trigger class="nav-util nav-util-icon" aria-label="Change theme">
		{#if currentMode === 'light'}
			<Sun class="size-3.5" />
		{:else if currentMode === 'dark'}
			<Moon class="size-3.5" />
		{:else}
			<Monitor class="size-3.5" />
		{/if}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="end" class="nav-util-menu">
		<DropdownMenu.Group>
			<DropdownMenu.GroupHeading>Theme</DropdownMenu.GroupHeading>
			{#each themeModes as t (t.value)}
				<DropdownMenu.Item
					class="nav-util-item"
					data-active={currentMode === t.value ? '' : undefined}
					onSelect={() => applyTheme(t.value)}
				>
					<t.icon class="size-3.5" />
					<span>{t.label}</span>
					{#if currentMode === t.value}
						<Check class="ml-auto size-3.5" />
					{/if}
				</DropdownMenu.Item>
			{/each}
		</DropdownMenu.Group>
	</DropdownMenu.Content>
</DropdownMenu.Root>

<!-- Language -->
<DropdownMenu.Root>
	<DropdownMenu.Trigger class="nav-util nav-util-icon" aria-label="Change language">
		<Languages class="size-3.5" />
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="end" class="nav-util-menu">
		<DropdownMenu.Group>
			<DropdownMenu.GroupHeading>Language</DropdownMenu.GroupHeading>
			{#each locales as locale (locale)}
				<DropdownMenu.Item
					class="nav-util-item"
					data-active={currentLocale === locale ? '' : undefined}
					onSelect={() => applyLocale(locale)}
				>
					<span class="nav-util-code">{locale.toUpperCase()}</span>
					<span>{localeLabels[locale] ?? locale}</span>
					{#if currentLocale === locale}
						<Check class="ml-auto size-3.5" />
					{/if}
				</DropdownMenu.Item>
			{/each}
		</DropdownMenu.Group>
	</DropdownMenu.Content>
</DropdownMenu.Root>

<style>
	/* ponytail: :global — these selectors target bits-ui menu internals
	   (DropdownMenu.Trigger / Item / Content), which Svelte cannot see. */

	:global(.nav-util-menu) {
		min-width: 10rem;
		border-radius: 0;
	}
	:global(.nav-util-item) {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		border-radius: 0;
		font-size: 0.6875rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		cursor: pointer;
	}
	:global(.nav-util-item[data-active]) {
		color: var(--foreground);
	}
	:global(.nav-util-code) {
		width: 1.75rem;
		flex-shrink: 0;
		color: var(--muted-foreground);
	}
</style>
