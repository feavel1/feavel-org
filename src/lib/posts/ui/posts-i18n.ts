// Posts UI copy resolver.
//
// The last hardcoded-English island in the public posts surface was relative
// timestamps and the commerce/comment chrome. Both live here so the components
// stay presentation-only, and so the plural/date rules are in one place instead
// of being re-derived in three templates.
import { m } from '#lib/paraglide/messages.js';
import { getLocale } from '#lib/paraglide/runtime.js';

/**
 * Paraglide locales are not all valid BCP-47 tags (`cn` is a country code, not
 * a language), so `toLocaleDateString` throws on the raw value. Map to the
 * locale Intl actually understands.
 */
const dateLocales: Record<string, string> = {
	en: 'en-US',
	cn: 'zh-CN',
	ru: 'ru-RU'
};

export function dateLocale(locale: string = getLocale()): string {
	return dateLocales[locale] ?? locale;
}

/**
 * Relative time, in the reader's language and at the reader's unit of
 * precision: minutes and hours as bare numerals, days up to a week, then a real
 * date. Call at render time — the locale can change between renders.
 */
export function timeAgo(ts: number, now: number = Date.now()): string {
	const sec = Math.floor((now - ts) / 1000);
	if (sec < 60) return m.posts_time_just_now();
	if (sec < 3600) return m.posts_time_minutes({ n: Math.floor(sec / 60) });
	if (sec < 86400) return m.posts_time_hours({ n: Math.floor(sec / 3600) });
	if (sec < 604800) return m.posts_time_days({ n: Math.floor(sec / 86400) });
	return new Date(ts).toLocaleDateString(dateLocale(), { month: 'short', day: 'numeric' });
}

/**
 * "{n} post" / "{n} posts". Russian and Chinese do not agree on where the
 * boundary sits, so the choice stays here rather than in the template.
 */
export function postCount(n: number): string {
	return n === 1 ? m.posts_filter_count_one({ n }) : m.posts_filter_count_other({ n });
}
