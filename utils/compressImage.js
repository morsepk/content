export const resizeAndCompressImage = (file, fileName) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    reader.onload = () => {
      img.onload = () => {
        const targetWidth = 825;
        const targetHeight = Math.round(targetWidth * (img.height / img.width));
        
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // Check for transparency
        const imageData = ctx.getImageData(0, 0, 1, 1);
        const hasTransparency = imageData.data[3] < 255;
        const format = hasTransparency ? 'png' : 'jpg';

        const processCompression = (quality = 0.8, attempt = 0) => {
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
                if (attempt < 6) {
                  return canvas.toBlob(
                    fallbackBlob => processCompression(quality - 0.1, attempt + 1),
                    'image/png',
                    Math.max(quality - 0.2, 0.1)
                  );
                }
                reject('PNG could not be compressed under 100KB');
              } else {
                // JPG quality reduction
                if (quality >= 0.3) {
                  return processCompression(quality - 0.15, attempt + 1);
                }
                // Final fallback with minimum quality
                canvas.toBlob(
                  finalBlob => resolve({
                    url: URL.createObjectURL(finalBlob),
                    name: fileName,
                    format: 'jpg',
                    size: finalBlob.size,
                    dimensions: { width: targetWidth, height: targetHeight }
                  }),
                  'image/jpeg',
                  0.3
                );
              }
            }
          }, `image/${format}`, format === 'jpg' ? quality : 0.8);
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