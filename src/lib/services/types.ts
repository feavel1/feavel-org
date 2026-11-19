export type PortfolioCategory = 'music' | 'mixing' | 'translation' | 'web';

/** The join between a service row and its message keys (`svc_<id>_*`). */
export type ServiceId = 'mixing' | 'music' | 'translation' | 'web';

/**
 * A service row with its copy resolved. Nothing here is stored as English in
 * `data.ts`: the seed carries only id + icon, the rest comes from messages.
 */
export type ServiceCard = {
	/** Stable anchor id (`#session-<id>`) and message-key prefix. Rename = orphaned keys. */
	id: ServiceId;
	icon: string;
	title: string;
	deliverable: string;
	scope: string;
	timeline: string;
	startingPrice: string;
};

/** The join between a catalogue row and its message keys (`svc_pf_*`). */
export type PortfolioId =
	| 'feavel-hub'
	| 'the-girl-from-the-river-to-the-sea'
	| 'dark-birds-fly-above-the-land-of-dreams'
	| 'life-under-a-cold-roof'
	| 'music-4-ads'
	| 'legal-translations'
	| 'x402'
	| 'cosveti';

/**
 * Tagline inputs, kept structured so one message per shape renders in every
 * locale instead of one hand-written English string per album. `custom` rows
 * take their tagline from a message keyed by id (see `catalog-i18n.ts`).
 */
export type PortfolioMeta =
	| { kind: 'album'; year: number; tracks: number; minutes: number }
	| { kind: 'since'; year: number }
	| { kind: 'year'; year: number }
	| { kind: 'custom' };

/**
 * Non-translatable catalogue facts. Every visible string is resolved in
 * `catalog-i18n.ts`, so this module can be read without reading English.
 */
export type PortfolioSource = {
	id: PortfolioId;
	category: PortfolioCategory;
	/** Published title — a proper noun. Never translated. */
	title: string;
	meta: PortfolioMeta;
	/** Verbatim provenance line (℗ plus streaming URL) for rows that have no prose. */
	description?: string;
	postId: string;
};

export type PortfolioEntry = {
	id: PortfolioId;
	category: PortfolioCategory;
	title: string;
	tagline: string;
	description: string;
	postId: string;
};
