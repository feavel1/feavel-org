/**
 * STUB-preserved helpers from the old Ark UI image-cropper.
 * The canvas crop math is unchanged — reuse it when you re-add a cropper.
 */
export interface CropArea {
	x: number;
	y: number;
	width: number;
	height: number;
}

/** Fetch an object URL back into a File for upload. */
export const getFileFromUrl = async (url: string, fileName = 'cropped.png'): Promise<File> => {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to fetch resource: ${response.status} ${response.statusText}`);
	}
	const blob = await response.blob();
	return new File([blob], fileName, { type: blob.type });
};

const createImage = (url: string): Promise<HTMLImageElement> =>
	new Promise((resolve, reject) => {
		const image = new Image();
		image.addEventListener('load', () => resolve(image));
		image.addEventListener('error', (error) => reject(error));
		image.setAttribute('crossOrigin', 'anonymous');
		image.src = url;
	});

const getRadianAngle = (degreeValue: number) => (degreeValue * Math.PI) / 180;

/**
 * Crop `imageSrc` to `pixelCrop`, returning an object URL for the PNG.
 * Sizes the canvas to a sqrt(2)-padded safe area so rotation never clips.
 */
export const getCroppedImg = async (
	imageSrc: string,
	pixelCrop: CropArea,
	rotation = 0
): Promise<string> => {
	const image = await createImage(imageSrc);
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Error getting 2d rendering context');

	const maxSize = Math.max(image.width, image.height);
	const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

	canvas.width = safeArea;
	canvas.height = safeArea;

	ctx.translate(safeArea / 2, safeArea / 2);
	ctx.rotate(getRadianAngle(rotation));
	ctx.translate(-safeArea / 2, -safeArea / 2);

	ctx.drawImage(image, safeArea / 2 - image.width * 0.5, safeArea / 2 - image.height * 0.5);
	const data = ctx.getImageData(0, 0, safeArea, safeArea);

	canvas.width = pixelCrop.width;
	canvas.height = pixelCrop.height;

	ctx.putImageData(
		data,
		Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
		Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
	);

	return new Promise((resolve) => {
		canvas.toBlob((file) => {
			resolve(URL.createObjectURL(file!));
		}, 'image/png');
	});
};

export const VALID_IMAGE_TYPES = [
	'image/apng',
	'image/avif',
	'image/gif',
	'image/jpeg',
	'image/png',
	'image/svg+xml',
	'image/webp'
];
