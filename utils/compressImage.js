// compressImage.js
export const resizeAndCompressImage = (file, fileName) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = () => {
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        let targetWidth = 825;
        let targetHeight = Math.round(targetWidth * (img.height / img.width));

        const processCompression = (quality = 0.8, dimensionAttempt = 0) => {
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
          const hasTransparency = [...imageData.data].some((_, i) => i % 4 === 3 && imageData.data[i] < 255);
          const format = hasTransparency ? 'png' : 'jpg';

          canvas.toBlob(blob => {
            if (!blob) return reject('Blob creation failed');

            if (blob.size <= 100 * 1024) {
              resolve({
                url: URL.createObjectURL(blob),
                name: fileName,
                format: format,
                size: blob.size,
                dimensions: { width: targetWidth, height: targetHeight }
              });
            } else {
              if (format === 'png') {
                // For PNGs: Reduce dimensions then quality
                if (dimensionAttempt < 5) {
                  targetWidth = Math.floor(targetWidth * 0.8);
                  targetHeight = Math.floor(targetWidth * (img.height / img.width));
                  processCompression(quality, dimensionAttempt + 1);
                } else if (quality > 0.3) {
                  processCompression(quality - 0.1, dimensionAttempt);
                } else {
                  reject('PNG could not be compressed under 100KB');
                }
              } else {
                // For JPGs: Reduce quality more aggressively
                if (quality > 0.3) {
                  processCompression(quality - 0.15, dimensionAttempt);
                } else {
                  reject('JPG could not be compressed under 100KB');
                }
              }
            }
          }, `image/${format}`, format === 'jpg' ? quality : undefined);
        };

        processCompression();
      };
      
      img.onerror = () => reject('Failed to load image');
      img.src = reader.result;
    };

    reader.onerror = () => reject('Failed to read file');
    reader.readAsDataURL(file);
  });
};