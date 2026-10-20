import { getContext, setContext } from 'svelte';
import { ZxcvbnFactory } from '@zxcvbn-ts/core';
import * as zxcvbnCommonPackage from '@zxcvbn-ts/language-common';
import * as zxcvbnEnPackage from '@zxcvbn-ts/language-en';

/**
 * STUB — replaces the Ark UI + runed password state.
 * Keeps the zxcvbn strength meter, hidden toggle, and submitted/invalid gating.
 */
const zxcvbn = new ZxcvbnFactory({
	translations: zxcvbnEnPackage.translations,
	graphs: zxcvbnCommonPackage.adjacencyGraphs,
	dictionary: { ...zxcvbnCommonPackage.dictionary, ...zxcvbnEnPackage.dictionary }
});

export class PasswordState {
	value = $state('');
	hidden = $state(true);
	submitted = $state(false);
	minScore: number;
	inputRef = $state<HTMLInputElement | null>(null);

	constructor(opts: { hidden: boolean; minScore: number }) {
		this.hidden = opts.hidden;
		this.minScore = opts.minScore;
	}

	strength = $derived.by(() => zxcvbn.check(this.value));

	get tooWeak() {
		return this.value !== '' && this.strength.score < this.minScore;
	}

	/** Only surface errors after a submit attempt. */
	errorMessage = $derived.by(() => {
		const input = this.inputRef;
		if (!input || !this.submitted || input.validity.valid) return null;
		if (input.validity.valueMissing) {
			const placeholder = input.getAttribute('placeholder')?.trim();
			if (!placeholder) return 'Enter a password.';
			return placeholder.endsWith('.') ? placeholder : `${placeholder}.`;
		}
		return input.validationMessage || 'Invalid value';
	});
}

const KEY = Symbol('password');

export const setPassword = (s: PasswordState) => setContext(KEY, s);
export const getPassword = () => getContext<PasswordState>(KEY);
