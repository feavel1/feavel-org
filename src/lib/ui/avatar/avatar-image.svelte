<script lang="ts">
	/** STUB — replace with shadcn-svelte `avatar`. */
	let { src, alt, ...rest }: { src?: string | null; alt?: string | null; [key: string]: unknown } =
		$props();
</script>

<img {src} {alt} {...rest} />
