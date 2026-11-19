// Services / portfolio copy resolver.
//
// `data.ts` holds structure (ids, catalogue numbers, provenance lines); this
// module is the only place that maps those ids onto messages. Resolvers are
// called at render time, never at module scope — the locale can change between
// renders, and a module-level call would freeze the first one.
//
// Never index `m` dynamically: a static record of getters keeps tree-shaking
// and type safety intact.
import { m } from '#lib/paraglide/messages.js';
import { portfolioSources, serviceSeeds } from './data';
import type {
	PortfolioCategory,
	PortfolioEntry,
	PortfolioId,
	PortfolioMeta,
	ServiceCard,
	ServiceId
} from './types';

type ServiceCopy = Omit<ServiceCard, 'id' | 'icon'>;

const serviceCopy: Record<ServiceId, () => ServiceCopy> = {
	mixing: () => ({
		title: m.svc_mixing_title(),
		deliverable: m.svc_mixing_deliverable(),
		scope: m.svc_mixing_scope(),
		timeline: m.svc_mixing_timeline(),
		startingPrice: m.svc_mixing_price()
	}),
	music: () => ({
		title: m.svc_music_title(),
		deliverable: m.svc_music_deliverable(),
		scope: m.svc_music_scope(),
		timeline: m.svc_music_timeline(),
		startingPrice: m.svc_music_price()
	}),
	translation: () => ({
		title: m.svc_translation_title(),
		deliverable: m.svc_translation_deliverable(),
		scope: m.svc_translation_scope(),
		timeline: m.svc_translation_timeline(),
		startingPrice: m.svc_translation_price()
	}),
	web: () => ({
		title: m.svc_web_title(),
		deliverable: m.svc_web_deliverable(),
		scope: m.svc_web_scope(),
		timeline: m.svc_web_timeline(),
		startingPrice: m.svc_web_price()
	})
};

export function getServices(): ServiceCard[] {
	return serviceSeeds.map((seed) => ({ id: seed.id, icon: seed.icon, ...serviceCopy[seed.id]() }));
}

const categoryLabels: Record<PortfolioCategory, () => string> = {
	music: () => m.svc_cat_music(),
	mixing: () => m.svc_cat_mixing(),
	translation: () => m.svc_cat_translation(),
	web: () => m.svc_cat_web()
};

/** The category slug is a free-form string on records; map the known ones. */
export function getCategoryLabel(category: string): string {
	return categoryLabels[category as PortfolioCategory]?.() ?? category;
}

/** Rows whose tagline is prose rather than a catalogue-number pattern. */
const customTaglines: Partial<Record<PortfolioId, () => string>> = {
	'feavel-hub': () => m.svc_pf_hub_tagline()
};

/**
 * Rows with a translatable description. Anything absent here falls back to the
 * verbatim ℗ provenance line carried in `data.ts` — those are copyright
 * notices plus URLs, and must not be rewritten.
 */
const descriptions: Partial<Record<PortfolioId, () => string>> = {
	'feavel-hub': () => m.svc_pf_hub_desc(),
	cosveti: () => m.svc_pf_cosveti_desc()
};

function tagline(id: PortfolioId, meta: PortfolioMeta): string {
	switch (meta.kind) {
		case 'album':
			return m.svc_pf_album_meta({
				year: meta.year,
				tracks: meta.tracks,
				minutes: meta.minutes
			});
		case 'since':
			return m.svc_pf_since({ year: meta.year });
		case 'year':
			return String(meta.year);
		case 'custom':
			return customTaglines[id]?.() ?? '';
	}
}

export function getPortfolioEntries(): PortfolioEntry[] {
	return portfolioSources.map((source) => ({
		...source,
		tagline: tagline(source.id, source.meta),
		description: descriptions[source.id]?.() ?? source.description ?? ''
	}));
}

/** Single-row lookup for the detail route; `undefined` means "not in the catalogue". */
export function findPortfolioEntry(id: string): PortfolioEntry | undefined {
	return getPortfolioEntries().find((entry) => entry.id === id);
}
