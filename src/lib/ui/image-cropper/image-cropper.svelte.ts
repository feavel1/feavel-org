import { getContext, setContext } from 'svelte';
import { getCroppedImg, VALID_IMAGE_TYPES, type CropArea } from './utils';

/**
 * STUB — this replaces the Ark UI + runed `Context` cropper state.
 * Implements the same public surface (open/tempUrl/pixelCrop + upload/cancel/crop).
 * Wire `Cropper` to any crop UI (svelte-easy-crop, bits-ui) that emits `CropArea`.
 */
export class ImageCropperState {
	#createdUrls: string[] = [];
	src = $state('');
	accept = $state('image/*');
	open = $state(false);
	tempUrl = $state<string>();
	pixelCrop = $state<CropArea>();
	onCropped: (url: string) => void;
	onUnsupportedFile: (file: File) => void;

	constructor(opts: {
		src: () => string;
		accept?: () => string;
		onCropped: (url: string) => void;
		onUnsupportedFile: (file: File) => void;
	}) {
		this.onCropped = opts.onCropped;
		this.onUnsupportedFile = opts.onUnsupportedFile;
		if (opts.accept) this.accept = opts.accept();
	}

	upload(file: File) {
		if (!VALID_IMAGE_TYPES.includes(file.type)) {
			this.onUnsupportedFile(file);
			return;
		}
		this.tempUrl = URL.createObjectURL(file);
		this.#createdUrls.push(this.tempUrl);
		this.open = true;
	}

	cancel() {
		this.tempUrl = undefined;
		this.pixelCrop = undefined;
		this.open = false;
	}

	async crop() {
		if (!this.pixelCrop || !this.tempUrl) return;
		this.src = await getCroppedImg(this.tempUrl, this.pixelCrop);
		this.open = false;
		this.onCropped(this.src);
	}

	dispose() {
		for (const url of this.#createdUrls) URL.revokeObjectURL(url);
	}
}

const KEY = Symbol('image-cropper');

export const setImageCropper = (state: ImageCropperState) => setContext(KEY, state);
export const getImageCropper = () => getContext<ImageCropperState>(KEY);
