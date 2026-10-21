<script lang="ts">
	let { label }: { label: string } = $props();
</script>

<div class="section-head">
	<span class="section-label">{label}</span>
	<div class="section-rule" aria-hidden="true"></div>
</div>

<style>
	.section-head {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 2rem;
	}
	.section-label {
		font-size: 0.6875rem;
		font-weight: 400;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--muted-foreground);
		white-space: nowrap;
	}
	.section-rule {
		flex: 1;
		height: 1px;
		background: var(--border);
		opacity: 0.4;
	}
</style>
