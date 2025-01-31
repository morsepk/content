export const resizeAndCompressImage = (file, fileName) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    
    // Create canvas with willReadFrequently
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    reader.onload = () => {
      img.onload = () => {
        let targetWidth = 825;
        let targetHeight = Math.round(targetWidth * (img.height / img.width));

        const processCompression = (quality = 0.7, dimensionAttempt = 0) => {
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          // Efficient transparency check (single pixel sample)
          const imageData = ctx.getImageData(0, 0, 1, 1);
          const hasTransparency = imageData.data[3] < 255;
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
                // Aggressive PNG compression
                if (dimensionAttempt < 5) {
                  targetWidth = Math.floor(targetWidth * 0.85);
                  targetHeight = Math.floor(targetWidth * (img.height / img.width));
                  return processCompression(0.7, dimensionAttempt + 1);
                }
                canvas.toBlob(fallbackBlob => {
                  resolve({
                    url: URL.createObjectURL(fallbackBlob),
                    name: fileName,
                    format: 'png',
                    size: fallbackBlob.size,
                    dimensions: { width: targetWidth, height: targetHeight }
                  });
                }, 'image/png', 0.5);
              } else {
                // JPG compression with dimension fallback
                if (quality >= 0.4) {
                  return processCompression(quality - 0.15, dimensionAttempt);
                }
                if (targetWidth > 600) {
                  targetWidth = 600;
                  targetHeight = Math.round(targetWidth * (img.height / img.width));
                  return processCompression(0.6, dimensionAttempt);
                }
                reject('Image cannot be compressed under 100KB');
              }
            }
          }, `image/${format}`, format === 'jpg' ? quality : 0.7);
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