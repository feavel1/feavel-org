<script lang="ts">
	import { Button } from '#lib/ui/button';
	import { Input } from '#lib/ui/input';
	import { Label } from '#lib/ui/label';
	import { Textarea } from '#lib/ui/textarea';
	import * as Select from '#lib/ui/select';
	import { Send } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { useConvexClient } from 'convex-svelte';
	import { getAuthContext } from '#lib/auth/context.svelte';
	const { api } = getAuthContext();
	const client = useConvexClient();

	let name = $state('');
	let email = $state('');
	let category = $state('music');
	let message = $state('');
	let sending = $state(false);

	const serviceOptions = [
		{ value: 'music', label: 'Music Production' },
		{ value: 'translation', label: 'Translation' },
		{ value: 'web', label: 'Web Development' }
	] as const;

	async function handleSubmit() {
		if (!name.trim() || !email.trim() || !message.trim()) {
			toast.error('Please fill in all fields');
			return;
		}
		sending = true;
		try {
			await client.mutation(api.services.mutations.submitContactInquiry, {
				name: name.trim(),
				email: email.trim(),
				category,
				message: message.trim()
			});
			toast.success("Message sent! I'll get back to you soon.");
			name = '';
			email = '';
			message = '';
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Failed to send message';
			toast.error(msg);
		} finally {
			sending = false;
		}
	}
</script>

<div class="contact-layout">
	<div class="contact-statement">
		<h2 class="contact-heading">Let's make something.</h2>
		<p class="contact-sub">
			Every project starts with a message. Tell me what you need — music, translation, or a web
			application — and I'll tell you honestly what it takes.
		</p>
		<div class="contact-alt">
			<span class="contact-alt-label">Prefer email?</span>
			<a href="mailto:hello@feavel.com" class="contact-alt-link">hello@feavel.com</a>
		</div>
	</div>

	<div class="contact-form-card">
		<form
			class="contact-form-fields"
			onsubmit={(e) => {
				e.preventDefault();
				handleSubmit();
			}}
		>
			<div class="contact-form-row">
				<div class="contact-form-field">
					<Label for="contact-name" class="field-label">Name</Label>
					<Input
						id="contact-name"
						type="text"
						placeholder="Your name"
						bind:value={name}
						class="field-input"
					/>
				</div>
				<div class="contact-form-field">
					<Label for="contact-email" class="field-label">Email</Label>
					<Input
						id="contact-email"
						type="email"
						placeholder="you@example.com"
						bind:value={email}
						class="field-input"
					/>
				</div>
			</div>

			<div class="contact-form-field">
				<Label for="contact-category" class="field-label">What do you need?</Label>
				<Select.Root type="single" bind:value={category}>
					<Select.Trigger id="contact-category" class="field-select w-full">
						{serviceOptions.find((s) => s.value === category)?.label ?? 'Select a service'}
					</Select.Trigger>
					<Select.Content>
						{#each serviceOptions as s (s.value)}
							<Select.Item value={s.value}>{s.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<div class="contact-form-field">
				<Label for="contact-message" class="field-label">Message</Label>
				<Textarea
					id="contact-message"
					placeholder="Describe your project, budget, and timeline..."
					class="field-textarea min-h-[120px]"
					bind:value={message}
				/>
			</div>

			<div class="contact-form-actions">
				<Button type="submit" disabled={sending} class="contact-submit-btn">
					<Send class="size-3.5" />
					{sending ? 'Sending...' : 'Send message'}
				</Button>
			</div>
		</form>
	</div>
</div>

<style>
	.contact-layout {
		display: grid;
		grid-template-columns: 1fr;
		gap: 3rem;
	}
	@media (min-width: 640px) {
		.contact-layout {
			grid-template-columns: 1fr 1fr;
			gap: 3rem;
		}
	}

	/* ── Statement ── */
	.contact-statement {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}
	.contact-heading {
		font-family: var(--font-heading);
		font-size: 1.25rem;
		font-weight: 400;
		letter-spacing: -0.01em;
		line-height: 1.2;
		margin: 0;
	}
	.contact-sub {
		font-size: 0.6875rem;
		line-height: 1.6;
		color: var(--muted-foreground);
		opacity: 0.55;
		max-width: 24rem;
		margin: 0;
	}
	.contact-alt {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding-top: 1rem;
		margin-top: 0.5rem;
		border-top: 1px solid var(--border);
	}
	.contact-alt-label {
		font-size: 0.625rem;
		font-weight: 400;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--muted-foreground);
		opacity: 0.5;
	}
	.contact-alt-link {
		font-size: 0.75rem;
		font-weight: 400;
		color: var(--accent-foreground);
		text-decoration: none;
		transition: opacity 0.15s;
	}
	.contact-alt-link:hover {
		opacity: 0.6;
	}

	/* ── Form ── */
	.contact-form-fields {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}
	.contact-form-row {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.25rem;
	}
	@media (min-width: 480px) {
		.contact-form-row {
			grid-template-columns: 1fr 1fr;
		}
	}
	.contact-form-field {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}
	.contact-form-actions {
		padding-top: 0.5rem;
	}

	/* ── Global overrides for shadcn components ── */
	:global(.field-label) {
		font-size: 0.625rem;
		font-weight: 400;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--muted-foreground);
		opacity: 0.6;
	}
	:global(.field-input) {
		border: none;
		border-bottom: 1px solid var(--border);
		border-radius: 0;
		background: transparent;
		font-size: 0.75rem;
		padding: 0.375rem 0;
	}
	:global(.field-input:focus) {
		border-color: var(--foreground);
		outline: none;
		box-shadow: none;
	}
	:global(.field-select) {
		background: transparent;
		border: 1px solid var(--border);
		border-radius: 0;
		font-size: 0.75rem;
	}
	:global(.field-textarea) {
		background: transparent;
		border: 1px solid var(--border);
		border-radius: 0;
		font-size: 0.75rem;
		resize: vertical;
	}
	:global(.field-textarea:focus) {
		border-color: var(--foreground);
		box-shadow: none;
	}
	:global(.contact-submit-btn) {
		font-size: 0.6875rem;
		font-weight: 400;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		height: 2.25rem;
		padding: 0 1.25rem;
		border-radius: 0;
	}
</style>
