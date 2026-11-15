import type { ServiceCard, PortfolioEntry } from './types';

export const services: ServiceCard[] = [
	{
		category: 'mixing',
		title: 'Mixing & Mastering',
		icon: 'Music',
		deliverable:
			'Professional mix and master for indie artists, podcasters, and content creators. Stereo stems or full session. Genre-agnostic — hip-hop, ambient, electronic, rock.',
		scope: 'Single track to full album',
		timeline: '3–7 days per track',
		startingPrice: '$75'
	},
	{
		category: 'music',
		title: 'Music Production',
		icon: 'Mic',
		deliverable:
			'Original beats, ambient soundscapes, full EP/album production from concept to master. Ableton Live, analog processing, vinyl simulation.',
		scope: 'Single track to full EP (5–7 tracks)',
		timeline: '1–4 weeks per track, 4–8 weeks for an EP',
		startingPrice: '$200'
	},

	{
		category: 'translation',
		title: 'Translation & Localization',
		icon: 'Languages',
		deliverable:
			'Technical documentation, game localization, UI strings, marketing copy. EN→RU (native Russian) and EN→ZH (Mandarin).',
		scope: '< 100 pages project',
		timeline: '1–3 business days per 1,000 words',
		startingPrice: '$0.10/word'
	},
	{
		category: 'web',
		title: 'Web Development',
		icon: 'Code',
		deliverable:
			'Full-stack SaaS applications, API integrations, rich-text platforms. SvelteKit, Convex, Tailwind CSS, Cloudflare Workers.',
		scope: 'MVP to production-grade platform',
		timeline: '2–6 weeks for MVP, ongoing for larger projects',
		startingPrice: 'Contact for price offer'
	}
];

export const portfolioEntries: PortfolioEntry[] = [
	{
		id: 'feavel-hub',
		category: 'web',
		title: 'feavel.com',
		tagline: 'Full-stack SvelteKit + Convex SaaS',
		description:
			'Authentication, organizations, rich-text editing, Solana x402 payments, and more.',
		postId: 'replace-with-real-post-id'
	},
	{
		id: 'the-girl-from-the-river-to-the-sea',
		category: 'music',
		title: 'The Girl from the River to the Sea (Original Score)',
		tagline: 'Album • 2025 - 18 songs • 29 minutes',
		description:
			'℗ 2025 Yixin Production. https://music.youtube.com/playlist?list=OLAK5uy_lcqSPLn9_jr7mgbx4EbmLhLB2TSPzxBho&si=goljHm2ZsylO4uVW',
		postId: 'replace-with-real-post-id'
	},
	{
		id: 'dark-birds-fly-above-the-land-of-dreams',
		category: 'music',
		title: 'Dark Birds Fly Above the Land of Dreams',
		tagline: 'Album • 2022 - 9 songs • 21 minutes',
		description: '℗ 2022 feavel.com https://music.163.com/#/album?id=138250855',
		postId: 'replace-with-real-post-id'
	},
	{
		id: 'life-under-a-cold-roof',
		category: 'music',
		title: 'Life Under a Cold Roof',
		tagline: 'Album • 2020 - 6 songs • 18 minutes',
		description: '℗ 2020 feavel.com x Idkaboutme (fima) https://music.163.com/#/album?id=92576490',
		postId: 'replace-with-real-post-id'
	},
	{
		id: 'music-4-ads',
		category: 'music',
		title: 'Music for Advertisements',
		tagline: 'Since • 2020',
		description: '℗ feavel.com',
		postId: 'replace-with-real-post-id'
	},
	{
		id: 'legal-translations',
		category: 'translation',
		title: 'Legal Translations',
		tagline: 'Since • 2024',
		description: '℗ feavel.com',
		postId: 'replace-with-real-post-id'
	},
	{
		id: 'x402',
		category: 'web',
		title: 'x402 Paywall',
		tagline: '2025',
		description: '℗ feavel.com',
		postId: 'replace-with-real-post-id'
	},
	{
		id: 'cosveti',
		category: 'web',
		title: 'cosveti-sync',
		tagline: '2026',
		description:
			'Real-time collaborative editing for TipTap in Svelte with Convex synchronization.',
		postId: 'replace-with-real-post-id'
	}
];
