<script lang="ts">
	import { parseBlob } from 'music-metadata';
	import PlayerSlider from './PlayerSlider.svelte';
	import { currentTrack, isPlaying, play, formatTime, audioEl, volume } from './player.svelte';
	import { onMount } from 'svelte';
	import PauseIcon from '@lucide/svelte/icons/pause';
	import PlayIcon from '@lucide/svelte/icons/play';
	import VolumeIcon from '@lucide/svelte/icons/volume-2';
	import AudioMotionAnalyzer from 'audiomotion-analyzer';

	let duration = $state(0);
	let currentTime = $state(0);
	let paused = $state(true);
	let volumeLocal = $state(0.5);

	let rAF: number | null = null;

	let audioElLocal = $state<HTMLAudioElement>();

	function playTrack() {
		$isPlaying = true;
		audioElLocal?.play();
	}

	function pauseTrack() {
		$isPlaying = false;
		cancelAnimationFrame(rAF!);
		audioElLocal?.pause();
	}

	function movePosition() {
		if (!audioElLocal?.paused) {
			cancelAnimationFrame(rAF!);
		}
	}

	function updatePosition() {
		audioElLocal!.currentTime = currentTime;
		if (!audioElLocal!.paused) {
			requestAnimationFrame(whilePlaying);
		}
	}

	function whilePlaying() {
		rAF = requestAnimationFrame(whilePlaying);
	}

	function handleVolumeChange() {
		if (!audioElLocal) return;
		audioElLocal.volume = volumeLocal;
		volume.set(volumeLocal);
	}

	volume.subscribe((v) => {
		volumeLocal = v;
		if (audioElLocal) audioElLocal.volume = v;
	});

	function handleEnded() {
		$isPlaying = false;
		currentTime = 0;
	}

	let vizContainer = $state<HTMLDivElement>();

	onMount(() => {
		audioEl.set(audioElLocal ?? null);
		if (!vizContainer || !audioElLocal) return;
		const instance = new AudioMotionAnalyzer(vizContainer, {
			source: audioElLocal,
			mode: 2,
			barSpace: 0.25,
			colorMode: 'bar-level',
			frequencyScale: 'log',
			gradient: 'prism',
			linearAmplitude: true,
			linearBoost: 3,
			maxFreq: 20000,
			minFreq: 20,
			reflexRatio: 0.5,
			reflexAlpha: 1,
			roundBars: true,
			showPeaks: false,
			showScaleX: false,
			smoothing: 0.7,
			weightingFilter: '468',
			overlay: true,
			bgAlpha: 0,
			loRes: true
		});
		return () => instance?.destroy();
	});

	let demoLoading = $state(false);

	async function playDemo() {
		demoLoading = true;
		try {
			const res = await fetch('/ZelenoglazoeTaksi.mp3');
			const blob = await res.blob();
			const meta = await parseBlob(blob).catch(() => null);
			play({
				src: '/ZelenoglazoeTaksi.mp3',
				title: meta?.common?.title ?? 'Goo Goo',
				artist: meta?.common?.artist ?? 'Demo'
			});
		} catch {
			play({
				src: '/ZelenoglazoeTaksi.mp3',
				title: 'Zelenoglazoe Taksi',
				artist: 'Oleg Kvasha'
			});
		} finally {
			demoLoading = false;
		}
	}
</script>

<audio
	bind:this={audioElLocal}
	bind:duration
	bind:currentTime
	bind:paused
	onended={handleEnded}
	crossorigin="anonymous"
	class="hidden"
></audio>

<div class="audio-bar">
	<div
		bind:this={vizContainer}
		class="pointer-events-none absolute inset-0 overflow-hidden opacity-60"
		aria-hidden="true"
	></div>
	<div class="audio-bar-inner">
		{#if $currentTrack}
			<div class="mx-auto flex max-w-4xl items-center gap-4">
				<!-- Track info -->
				<div class="min-w-0 shrink-0 text-sm">
					<p class="truncate font-medium">{$currentTrack.title ?? 'Untitled'}</p>
					<p class="truncate text-xs text-muted-foreground">{$currentTrack.artist ?? ''}</p>
				</div>

				<!-- Play/pause -->
				<button class="audio-play-btn" onclick={paused ? playTrack : pauseTrack}>
					{#if !paused}
						<PauseIcon />
					{:else}
						<PlayIcon />
					{/if}
				</button>

				<!-- Seek -->
				<div class="flex flex-1 items-center gap-2">
					<span class="w-10 text-right text-xs text-muted-foreground tabular-nums"
						>{formatTime(currentTime)}</span
					>
					<div class="flex-1">
						<PlayerSlider
							min={0}
							bind:value={currentTime}
							max={duration || 1}
							step={0.01}
							precision={2}
							formatter={(v: number) => formatTime(v)}
						/>
					</div>
					<span class="w-10 text-left text-xs text-muted-foreground tabular-nums"
						>{formatTime(duration)}</span
					>
				</div>

				<!-- Volume -->
				<div class="hidden items-center gap-2 sm:flex">
					<VolumeIcon class="size-3.5 text-muted-foreground" />
					<div class="w-20">
						<PlayerSlider
							min={0}
							max={1}
							step={0.01}
							precision={2}
							formatter={(v: number) => Math.round(v * 100)}
							bind:value={volumeLocal}
						/>
					</div>
				</div>
			</div>
		{:else}
			<div class="mx-auto flex max-w-4xl items-center justify-center">
				<button onclick={playDemo} disabled={demoLoading} class="audio-demo-btn">
					<PlayIcon class="size-3.5" />
					{demoLoading ? 'Loading...' : 'Play Demo'}
				</button>
			</div>
		{/if}
	</div>
</div>

<style>
	/* Player bar as denser dot band — The Weathered Wall design system */
	.audio-bar {
		position: fixed;
		right: 0;
		bottom: 0;
		left: 0;
		z-index: 50;
		border-top: 1px solid var(--border);
		background: var(--background);
	}
	.audio-bar::before {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: -1;
		background-image: radial-gradient(circle, var(--foreground) 0.3px, transparent 0.3px);
		background-size: 8px 8px;
		opacity: 0.08;
	}

	.audio-bar-inner {
		position: relative;
		padding: 0.5rem 1rem;
	}

	.audio-play-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		flex-shrink: 0;
		color: var(--foreground);
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		opacity: 0.5;
		transition: opacity 0.2s;
	}
	.audio-play-btn:hover {
		opacity: 0.8;
	}

	.audio-demo-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.375rem 0.75rem;
		font-size: 0.6875rem;
		font-weight: 400;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--muted-foreground);
		background: transparent;
		border: 1px solid var(--border);
		cursor: pointer;
		transition:
			color 0.2s,
			border-color 0.2s;
	}
	.audio-demo-btn:hover {
		color: var(--foreground);
		border-color: var(--muted-foreground);
	}
	.audio-demo-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}
</style>
