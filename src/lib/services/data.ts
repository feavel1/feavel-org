// Catalogue structure only — no English copy lives here.
//
// Every visible string is resolved through `catalog-i18n.ts`, which maps these
// ids onto message keys. Ids are the join between data and keys: renaming one
// silently orphans its messages across every locale, so add the ids in all
// locales first.
//
// What stays here on purpose:
//   · album/project titles — proper nouns, published that way
//   · the ℗ provenance lines — copyright information plus streaming URLs
//   · catalogue numbers (year, track counts, duration) — fed to messages
//   · `postId` — a reference, not copy
import type { PortfolioSource, ServiceId } from './types';

/** A service row: id is the message prefix, icon is a lucide name. */
export type ServiceSeed = { id: ServiceId; icon: string };

export const serviceSeeds: ServiceSeed[] = [
	{ id: 'mixing', icon: 'Music' },
	{ id: 'music', icon: 'Mic' },
	{ id: 'translation', icon: 'Languages' },
	{ id: 'web', icon: 'Code' }
];

export const portfolioSources: PortfolioSource[] = [
	{
		id: 'feavel-hub',
		category: 'web',
		title: 'feavel.com',
		meta: { kind: 'custom' },
		postId: 'replace-with-real-post-id'
	},
	{
		id: 'the-girl-from-the-river-to-the-sea',
		category: 'music',
		title: 'The Girl from the River to the Sea (Original Score)',
		meta: { kind: 'album', year: 2025, tracks: 18, minutes: 29 },
		description:
			'℗ 2025 Yixin Production. https://music.youtube.com/playlist?list=OLAK5uy_lcqSPLn9_jr7mgbx4EbmLhLB2TSPzxBho&si=goljHm2ZsylO4uVW',
		postId: 'replace-with-real-post-id'
	},
	{
		id: 'dark-birds-fly-above-the-land-of-dreams',
		category: 'music',
		title: 'Dark Birds Fly Above the Land of Dreams',
		meta: { kind: 'album', year: 2022, tracks: 9, minutes: 21 },
		description: '℗ 2022 feavel.com https://music.163.com/#/album?id=138250855',
		postId: 'replace-with-real-post-id'
	},
	{
		id: 'life-under-a-cold-roof',
		category: 'music',
		title: 'Life Under a Cold Roof',
		meta: { kind: 'album', year: 2020, tracks: 6, minutes: 18 },
		description: '℗ 2020 feavel.com x Idkaboutme (fima) https://music.163.com/#/album?id=92576490',
		postId: 'replace-with-real-post-id'
	},
	{
		id: 'music-4-ads',
		category: 'music',
		title: 'Music for Advertisements',
		meta: { kind: 'since', year: 2020 },
		description: '℗ feavel.com',
		postId: 'replace-with-real-post-id'
	},
	{
		id: 'legal-translations',
		category: 'translation',
		title: 'Legal Translations',
		meta: { kind: 'since', year: 2024 },
		description: '℗ feavel.com',
		postId: 'replace-with-real-post-id'
	},
	{
		id: 'x402',
		category: 'web',
		title: 'x402 Paywall',
		meta: { kind: 'year', year: 2025 },
		postId: 'replace-with-real-post-id'
	},
	{
		id: 'cosveti',
		category: 'web',
		title: 'cosveti-sync',
		meta: { kind: 'year', year: 2026 },
		postId: 'replace-with-real-post-id'
	}
];
