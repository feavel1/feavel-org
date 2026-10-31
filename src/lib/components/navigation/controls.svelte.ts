// Shared state between the nav bar, the mobile drawer and the command palette.
// Keep this dumb: no DOM, no Convex — just the mutually-exclusive "which search
// surface is showing" flag.
let open = $state(false);

export const searchOverlay = {
	get open() {
		return open;
	},
	show() {
		open = true;
	},
	hide() {
		open = false;
	},
	toggle() {
		open = !open;
	}
};
