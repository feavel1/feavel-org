<script lang="ts">
	let {
		min = 0,
		max = 100,
		step = 1,
		value = $bindable(50),
		formatter = (v: number) => v,
		precision = 3
	} = $props();

	let sliderEl = $state<HTMLDivElement>();
	let handleEl = $state<HTMLSpanElement>();
	let fillEl = $state<HTMLSpanElement>();

	let focus = $state(false);
	let handleActivated = false;
	let handlePressed = $state(false);
	let keyboardActive = false;

	let percentageValue = $derived(Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100)));

	function alignValueToStep(v: number): number {
		if (v <= min) return min;
		if (v >= max) return max;
		const remainder = (v - min) % step;
		let aligned = v - remainder;
		if (Math.abs(remainder) * 2 >= step) {
			aligned += remainder > 0 ? step : -step;
		}
		return Math.max(min, Math.min(max, parseFloat(aligned.toFixed(precision))));
	}

	function eventPosition(event: MouseEvent | TouchEvent): number {
		const e = 'touches' in event ? event.touches[0] : event;
		return e.clientX;
	}

	function getSliderDimensions() {
		return sliderEl!.getBoundingClientRect();
	}

	function handleInteract(clientX: number) {
		const dims = getSliderDimensions();
		const pct = ((clientX - dims.left) / dims.width) * 100;
		const raw = ((max - min) / 100) * pct + min;
		value = alignValueToStep(raw);
	}

	function sliderInteractStart(event: MouseEvent | TouchEvent) {
		focus = true;
		handleActivated = true;
		handlePressed = true;
		if (event.type === 'touchstart') {
			handleInteract(eventPosition(event));
		}
	}

	function sliderInteractEnd() {
		handlePressed = false;
	}

	function bodyInteractStart(event: MouseEvent | TouchEvent) {
		keyboardActive = false;
		if (focus && event.target !== sliderEl && !sliderEl?.contains(event.target as Node)) {
			focus = false;
		}
	}

	function bodyInteract(event: MouseEvent | TouchEvent) {
		if (handleActivated) {
			handleInteract(eventPosition(event));
		}
	}

	function targetIsHandle(element: EventTarget | null): boolean {
		if (!sliderEl || !element) return false;
		const handles = sliderEl.querySelectorAll('[role="slider"]');
		return Array.from(handles).some((h) => h === element || h.contains(element as Node));
	}

	function bodyMouseUp(event: MouseEvent) {
		if (
			handleActivated &&
			(event.target === sliderEl || sliderEl?.contains(event.target as Node))
		) {
			focus = true;
			if (!targetIsHandle(event.target)) {
				handleInteract(event.clientX);
			}
		}
		handleActivated = false;
		handlePressed = false;
	}

	function bodyTouchEnd() {
		handleActivated = false;
		handlePressed = false;
	}

	function bodyKeyDown() {
		keyboardActive = true;
	}

	function sliderKeydown(e: KeyboardEvent) {
		const jump = e.ctrlKey || e.metaKey || e.shiftKey ? step * 10 : step;
		switch (e.key) {
			case 'ArrowRight':
			case 'ArrowUp':
				e.preventDefault();
				value = alignValueToStep(value + jump);
				break;
			case 'ArrowLeft':
			case 'ArrowDown':
				e.preventDefault();
				value = alignValueToStep(value - jump);
				break;
			case 'Home':
				e.preventDefault();
				value = min;
				break;
			case 'End':
				e.preventDefault();
				value = max;
				break;
		}
	}

	function sliderBlur() {
		if (keyboardActive) {
			focus = false;
			handleActivated = false;
			handlePressed = false;
		}
	}

	function sliderFocus() {
		focus = true;
	}
</script>

<svelte:window
	onmousedown={bodyInteractStart}
	ontouchstart={bodyInteractStart}
	onmousemove={bodyInteract}
	ontouchmove={bodyInteract}
	onmouseup={bodyMouseUp}
	ontouchend={bodyTouchEnd}
	onkeydown={bodyKeyDown}
/>

<div
	bind:this={sliderEl}
	role="presentation"
	class="relative h-2 cursor-pointer rounded-full bg-muted select-none {focus
		? 'ring-2 ring-ring ring-offset-2'
		: ''}"
	ontouchstart={(e) => {
		e.preventDefault();
		sliderInteractStart(e);
	}}
	onmousedown={sliderInteractStart}
	ontouchend={sliderInteractEnd}
	onmouseup={sliderInteractEnd}
>
	<span
		bind:this={fillEl}
		class="absolute top-0 left-0 h-full rounded-full bg-primary/60 transition-[background] duration-200 select-none"
		style="width: {percentageValue}%"
	></span>
	<span
		bind:this={handleEl}
		role="slider"
		tabindex="0"
		class="absolute top-1/2 z-10 flex size-4 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-full bg-primary shadow-sm transition-[background,box-shadow] duration-200 outline-none select-none"
		class:active={focus}
		class:cursor-grabbing={handlePressed}
		style="left: {percentageValue}%"
		aria-valuenow={percentageValue}
		aria-valuemin={min}
		aria-valuemax={max}
		aria-valuetext={String(formatter(value))}
		aria-orientation="horizontal"
		onblur={sliderBlur}
		onfocus={sliderFocus}
		onkeydown={sliderKeydown}
	>
		<span class="size-2 rounded-full bg-background"></span>
	</span>
</div>
