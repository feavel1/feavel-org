<script lang="ts">
	import { Avatar as AvatarPrimitive } from '@ark-ui/svelte/avatar';
	import { cn } from '../../utils.js';

	let { class: className, ...restProps }: AvatarPrimitive.FallbackProps = $props();
</script>

<AvatarPrimitive.Fallback
	class={cn('flex size-full items-center justify-center rounded-full bg-muted', className)}
	{...restProps}
/>
