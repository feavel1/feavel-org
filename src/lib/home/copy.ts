// Home page copy resolver.
//
// The bench and the reading prompts are structured data, but every visible
// string in them is translated. The page never indexes `m` dynamically (that
// defeats tree-shaking and loses type safety), so ids stay stable here and this
// module is the only place that maps id -> message.
//
// Ids are the join between data and keys: renaming one silently orphans its
// three messages across every locale. Add a discipline in all locales first.
import { m } from '#lib/paraglide/messages.js';
import { resolve } from '$app/paths';

/** A route passed through `resolve()`; a query string or hash widens it to string. */
export type ResolvedHref = string;

export type DisciplineId = 'music' | 'code' | 'language';

export type Discipline = {
	id: DisciplineId;
	label: string;
	/** The panel lead — a question in the visitor's register, not a claim. */
	question: string;
	fluent: string;
	proof: string;
	cta: string;
	href: ResolvedHref;
};

/** Call at render time, never at module scope: the locale can change. */
export function getDisciplines(): Discipline[] {
	return [
		{
			id: 'music',
			label: m.home_bench_music(),
			question: m.home_bench_music_q(),
			fluent: m.home_bench_music_fluent(),
			proof: m.home_bench_music_proof(),
			cta: m.home_bench_music_cta(),
			href: `${resolve('/services')}#session-music`
		},
		{
			id: 'code',
			label: m.home_bench_code(),
			question: m.home_bench_code_q(),
			fluent: m.home_bench_code_fluent(),
			proof: m.home_bench_code_proof(),
			cta: m.home_bench_code_cta(),
			href: `${resolve('/services')}#session-web`
		},
		{
			id: 'language',
			label: m.home_bench_language(),
			question: m.home_bench_language_q(),
			fluent: m.home_bench_language_fluent(),
			proof: m.home_bench_language_proof(),
			cta: m.home_bench_language_cta(),
			href: `${resolve('/services')}#session-translation`
		}
	];
}

export type ReadingPrompt = {
	ask: string;
	hint: string;
	href: ResolvedHref;
};

/**
 * The questions that lead into the list.
 *
 * `categories` is whatever the reader actually published — never a hardcoded
 * taxonomy. Each category gets one prompt, and the prompt text is built from
 * the category name itself rather than a bespoke sentence per category, so a
 * new category ("business", "finance", …) needs no new message keys.
 *
 * The prompts run out gracefully: with no categories at all the list is empty
 * and only the "browse everything" prompt renders.
 */
export function getReadingPrompts(categories: string[]): ReadingPrompt[] {
	const posts = resolve('/posts');
	const prompts: ReadingPrompt[] = categories.map((category) => ({
		ask: m.home_ask_prompt({ category }),
		hint: m.home_ask_prompt_hint({ category }),
		href: `${posts}?category=${encodeURIComponent(category)}`
	}));

	prompts.push({
		ask: m.home_ask_prompt_any(),
		hint: m.home_ask_prompt_any_hint(),
		href: posts
	});

	return prompts;
}
