/**
 * Compresses an image file to a target size in KB
 * @param file The file to compress
 * @param targetSizeKB The target size in KB (default 100)
 * @param shouldCropSquare Whether to crop the image to a square (center crop)
 * @returns A promise that resolves to a base64 string or the original if error
 */
export const compressImage = (file: File, targetSizeKB: number = 100, shouldCropSquare: boolean = false): Promise<string> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                let sourceX = 0;
                let sourceY = 0;
                let sourceWidth = width;
                let sourceHeight = height;

                if (shouldCropSquare) {
                    const size = Math.min(width, height);
                    sourceX = (width - size) / 2;
                    sourceY = (height - size) / 2;
                    sourceWidth = size;
                    sourceHeight = size;
                    width = size;
                    height = size;
                }

                // Max resolution for standard receipt photos
                const MAX_WIDTH = 1200;
                if (width > MAX_WIDTH) {
                    const ratio = MAX_WIDTH / width;
                    width = MAX_WIDTH;
                    height = height * ratio;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                
                // Use source coordinates for cropping
                ctx?.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);

                // Detect if we should use PNG to preserve transparency
                const isPng = file.type === 'image/png';
                const outputType = isPng ? 'image/png' : 'image/jpeg';

                if (isPng) {
                    // For PNG, transparency is preserved but compression quality is not supported in toDataURL
                    resolve(canvas.toDataURL('image/png'));
                    return;
                }

                // Iterate quality to find target size for JPEG
                let quality = 0.7;
                let dataUrl = canvas.toDataURL('image/jpeg', quality);
                
                while ((dataUrl.length * 0.75) / 1024 > targetSizeKB && quality > 0.1) {
                    quality -= 0.1;
                    dataUrl = canvas.toDataURL('image/jpeg', quality);
                }
                
                resolve(dataUrl);
            };
            img.onerror = () => resolve('');
        };
        reader.onerror = () => resolve('');
    });
};
