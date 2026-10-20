<script lang="ts">
	import { Select as SelectPrimitive } from '@ark-ui/svelte/select';
	import { cn } from '../../utils.js';

	let { class: className, children, ...restProps }: SelectPrimitive.LabelProps = $props();
</script>

<SelectPrimitive.Label
	data-slot="select-label"
	class={cn('px-2 py-1.5 text-xs text-muted-foreground', className)}
	{...restProps}
>
	{@render children?.()}
</SelectPrimitive.Label>
