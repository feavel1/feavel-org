import { writable, get } from 'svelte/store';

export interface PlayerTrack {
	src: string;
	title?: string;
	artist?: string;
	coverUrl?: string;
	duration?: number;
}

export const currentTrack = writable<PlayerTrack | null>(null);
export const isPlaying = writable(false);
export const volume = writable(0.5);
export const audioEl = writable<HTMLAudioElement | null>(null);

export function play(track: PlayerTrack) {
	currentTrack.set(track);
	isPlaying.set(true);
	const el = get(audioEl);
	if (!el) return;
	if (!el.src.endsWith(track.src)) {
		el.src = track.src;
		el.load();
	}
	el.volume = get(volume);
	el.play().catch(() => {});
}

export function pause() {
	isPlaying.set(false);
	const el = get(audioEl);
	if (el && !el.paused) el.pause();
}

export function toggle(track?: PlayerTrack) {
	const cur = get(currentTrack);
	if (track && (!cur || cur.src !== track.src)) {
		play(track);
	} else if (get(isPlaying)) {
		pause();
	} else {
		const el = get(audioEl);
		if (el && cur)
			el.play()
				.then(() => isPlaying.set(true))
				.catch(() => {});
	}
}

export function formatTime(seconds: number): string {
	if (isNaN(seconds) || seconds < 0) return '0:00';
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${s.toString().padStart(2, '0')}`;
}
