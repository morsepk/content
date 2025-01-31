// compressImage.js
export const resizeAndCompressImage = (file, fileName) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = () => {
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        // Initial dimensions
        let targetWidth = 825;
        let targetHeight = Math.round(targetWidth * (img.height / img.width));

        const processImage = () => {
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
          const hasTransparency = [...imageData.data].some((_, i) => i % 4 === 3 && imageData.data[i] < 255);
          const format = hasTransparency ? 'png' : 'jpg';

          const handleCompression = (quality = 0.9) => {
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
                  // For PNGs, reduce dimensions aggressively
                  if (targetWidth > 100) {
                    targetWidth = Math.floor(targetWidth * 0.9);
                    targetHeight = Math.floor(targetWidth * (img.height / img.width));
                    processImage();
                  } else {
                    reject('Image cannot be compressed under 100KB');
                  }
                } else {
                  // For JPGs, reduce quality
                  if (quality >= 0.2) {
                    handleCompression(quality - 0.1);
                  } else {
                    reject('Image cannot be compressed under 100KB');
                  }
                }
              }
            }, `image/${format}`, format === 'jpg' ? quality : 9);
          };

          handleCompression();
        };

        processImage();
      };
      
      img.onerror = () => reject('Failed to load image');
      img.src = reader.result;
    };

    reader.onerror = () => reject('Failed to read file');
    reader.readAsDataURL(file);
  });
};