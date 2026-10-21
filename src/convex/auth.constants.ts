import type { AuthConstants } from './auth.constants.types';

export const AUTH_CONSTANTS: AuthConstants = {
	sendEmails: true,
	apiKeys: true,
	organizations: true,
	providers: {
		// emailOTP: true,
		// magicLink: true,
		// github: true,
		// google: true,
		password: true
		// vk: true
	},
	brandName: 'Feavel MONO(lyth)',
	brandTagline: 'Secure authentication inside your browser.',
	terms: '/terms',
	privacy: '/privacy'
};
