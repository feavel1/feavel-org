export type PortfolioCategory = 'music' | 'mixing' | 'translation' | 'web';

export type ServiceCard = {
	category: PortfolioCategory;
	title: string;
	icon: string;
	deliverable: string;
	scope: string;
	timeline: string;
	startingPrice: string;
};

export type PortfolioEntry = {
	id: string;
	category: PortfolioCategory;
	title: string;
	tagline: string;
	description: string;
	postId: string;
};
