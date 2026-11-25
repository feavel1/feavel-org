/**
 * Feed filters live in the query string, and only there:
 * `?category=technical&tags=rust,web&postId=…`.
 *
 * One source of truth buys two things: a filtered feed is a link that can be
 * shared, and the UI cannot drift from the URL because it renders what the URL
 * says instead of keeping a copy that has to be kept in sync.
 *
 * These helpers are plain functions so the mapping is testable on its own and
 * the page component stays about layout.
 */

export type FeedFilters = {
	/** Single-select, `null` means "all categories". */
	category: string | null;
	/** Multi-select, ANDed: a post must carry every tag. */
	tags: string[];
	/** The post expanded in the feed, if any. */
	postId: string | null;
};

/**
 * Just enough of a URL to read from: `page.url` is a read-only view of the
 * browser URL, so these helpers take the shape they use instead of a `URL`.
 */
type UrlReadable = { readonly searchParams: { get(name: string): string | null } };

/** Read filters out of a URL, treating blank parameters as absent. */
export function readFilters(url: UrlReadable): FeedFilters {
	const params = url.searchParams;
	const tags = params
		.get('tags')
		?.split(',')
		.map((tag) => tag.trim())
		.filter(Boolean);

	return {
		category: params.get('category')?.trim() || null,
		// Deduped so a hand-edited URL cannot render the same chip twice.
		tags: [...new Set(tags ?? [])],
		postId: params.get('postId') || null
	};
}

/** The URL for `filters`; an absent value removes its parameter entirely. */
export function writeFilters(
	url: UrlReadable & { readonly href: string },
	filters: FeedFilters
): URL {
	const next = new URL(url.href);
	const set = (key: string, value: string | null) => {
		if (value) next.searchParams.set(key, value);
		else next.searchParams.delete(key);
	};

	set('category', filters.category);
	set('tags', filters.tags.length > 0 ? filters.tags.join(',') : null);
	set('postId', filters.postId);

	return next;
}

/** Add `tag` to the selection, or drop it when it is already selected. */
export function toggleTag(tags: string[], tag: string): string[] {
	return tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
}
