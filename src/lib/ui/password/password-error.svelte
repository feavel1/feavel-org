<script lang="ts">
	/**
	 * Shows the sibling `Password.Input`'s constraint-validation message once the
	 * surrounding form has been submitted.
	 *
	 * The input element is discovered through the DOM (this component is rendered
	 * as a sibling of `Password.Input` inside `Password.Root`) because the root
	 * context does not expose the input ref. Registering `usePasswordInput` here
	 * would create a second `PasswordInputState` that double-watches `value`, so
	 * the root state is deliberately left untouched.
	 */
	let el: HTMLParagraphElement | null = $state(null);
	let message = $state('');

	$effect(() => {
		const anchor = el;
		if (!anchor) return;

		const input = anchor.parentElement?.querySelector('input');
		if (!input) return;

		const form = input.form;
		let submitted = false;

		const update = () => {
			if (!submitted || input.validity.valid) {
				message = '';
				return;
			}

			if (input.validity.valueMissing) {
				const placeholder = input.getAttribute('placeholder')?.trim();
				message = placeholder
					? placeholder.endsWith('.')
						? placeholder
						: `${placeholder}.`
					: 'Enter a password.';
				return;
			}

			message = input.validationMessage || 'Invalid value';
		};

		const onSubmit = () => {
			submitted = true;
			update();
		};

		form?.addEventListener('submit', onSubmit);
		input.addEventListener('input', update);

		return () => {
			form?.removeEventListener('submit', onSubmit);
			input.removeEventListener('input', update);
		};
	});
</script>

<p bind:this={el} data-password-error class="text-xs text-destructive" class:hidden={!message}>
	{message}
</p>
