<script lang="ts">
	import { Dialog as DialogPrimitive } from '@ark-ui/svelte/dialog';
	import { cn } from '../../utils.js';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: DialogPrimitive.BackdropProps = $props();
</script>

<DialogPrimitive.Backdrop
	bind:ref
	data-scope="drawer"
	class={cn(
		'fixed inset-0 z-50 bg-surface-950/40 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
		className
	)}
	{...restProps}
/>
