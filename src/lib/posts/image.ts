/**
 * Shrink an image before it goes to R2.
 *
 * ponytail: the multiplier is pixel count, not codec — measured on a real photo,
 * 3000x2000 -> 2048px WebP saved 1.4x, while the codec alone saved only 20% at
 * equal dimensions. So: resize first, WebP second, bail out often.
 *
 * Every decision is logged (dev only) as `[img] <original> -> <result>`, so the
 * numbers can be checked against real uploads before trusting the defaults.
 */

const MAX_SIDE = 2048; // longest edge kept, px
const QUALITY = 0.82;
const SKIP_BYTES = 600 * 1024; // under this, and already small enough, don't touch it

/** Never rasterise these: animations collapse to one frame, vectors lose their point. */
const UNTOUCHABLE = new Set(['image/gif', 'image/svg+xml']);

const log = (...args: unknown[]) => {
	if (import.meta.env.DEV) console.info('[img]', ...args);
};

/** HTMLCanvasElement.toBlob in a promise. Universal, unlike OffscreenCanvas. */
const encode = (canvas: HTMLCanvasElement, type: string, quality: number) =>
	new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

const kb = (bytes: number) => `${Math.round(bytes / 1024)} KB`;

export async function compressImage(file: File): Promise<File> {
	const label = file.name || file.type;

	if (UNTOUCHABLE.has(file.type)) {
		log(`${label}: untouched (${file.type})`);
		return file;
	}

	let bitmap: ImageBitmap;
	try {
		// ponytail: 'from-image' bakes EXIF rotation into the pixels. Canvas drops
		// EXIF afterwards, which also drops GPS — acceptable, arguably desirable.
		bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
	} catch {
		log(`${label}: untouched (browser cannot decode ${file.type})`);
		return file;
	}

	const longest = Math.max(bitmap.width, bitmap.height);
	const sourceDims = `${bitmap.width}x${bitmap.height}`;
	if (longest <= MAX_SIDE && file.size <= SKIP_BYTES) {
		bitmap.close();
		log(`${label}: untouched (${sourceDims} / ${kb(file.size)} already small enough)`);
		return file;
	}

	const scale = Math.min(1, MAX_SIDE / longest);
	const canvas = document.createElement('canvas');
	canvas.width = Math.round(bitmap.width * scale);
	canvas.height = Math.round(bitmap.height * scale);
	const ctx = canvas.getContext('2d');
	if (!ctx) {
		bitmap.close();
		log(`${label}: untouched (no 2d context)`);
		return file;
	}
	ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
	bitmap.close();

	const started = performance.now();
	// ponytail: WebP only. Asking Chrome for 'image/avif' silently hands back a
	// PNG — bigger than what we started with — so we never ask.
	let blob = await encode(canvas, 'image/webp', QUALITY);
	if (!blob || blob.type !== 'image/webp') {
		blob = await encode(canvas, 'image/jpeg', QUALITY);
	}
	const ms = Math.round(performance.now() - started);

	if (!blob || !blob.type.startsWith('image/') || blob.size >= file.size) {
		log(
			`${label}: kept original (encode gave ${blob ? kb(blob.size) : 'nothing'} vs ${kb(file.size)})`
		);
		return file;
	}

	log(
		`${label}: ${sourceDims} ${kb(file.size)} -> ${canvas.width}x${canvas.height} ${kb(blob.size)} (-${Math.round((1 - blob.size / file.size) * 100)}%)`,
		`${blob.type.replace('image/', '')} q${QUALITY} encoded in ${ms}ms`
	);

	const name = file.name.replace(/\.[^.]+$/, '') + (blob.type === 'image/webp' ? '.webp' : '.jpg');
	return new File([blob], name, { type: blob.type });
}
