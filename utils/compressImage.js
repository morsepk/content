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

        if (format === 'png') {
          // Existing PNG compression logic remains unchanged
          canvas.toBlob(blob => {
            if (!blob) return reject('Blob creation failed');
            resolve({
              url: URL.createObjectURL(blob),
              name: fileName,
              format: 'png',
              size: blob.size,
              dimensions: { width: targetWidth, height: targetHeight }
            });
          }, 'image/png', 0.7);
        } else {
          // New JPG compression with binary search optimization
          const getBlob = (quality) => {
            return new Promise((resolveBlob, rejectBlob) => {
              canvas.toBlob(blob => {
                if (!blob) rejectBlob('Blob creation failed');
                resolveBlob(blob);
              }, 'image/jpeg', quality);
            });
          };

          const findOptimalQuality = async () => {
            let low = 0.1;  // Minimum quality threshold
            let high = 1.0;
            let bestBlob = null;
            let bestQuality = low;

            try {
              // Check maximum quality first
              const maxQualityBlob = await getBlob(high);
              if (maxQualityBlob.size <= 100 * 1024) {
                return { blob: maxQualityBlob, quality: high };
              }

              // Binary search for optimal quality
              for (let i = 0; i < 10; i++) {
                const mid = (low + high) / 2;
                const midBlob = await getBlob(mid);

                if (midBlob.size <= 100 * 1024) {
                  bestBlob = midBlob;
                  bestQuality = mid;
                  low = mid; // Try higher qualities
                } else {
                  high = mid; // Try lower qualities
                }
              }

              // Final check with best found quality
              if (bestBlob) return { blob: bestBlob, quality: bestQuality };

              // Fallback to minimum quality check
              const minBlob = await getBlob(low);
              if (minBlob.size > 100 * 1024) {
                throw new Error('Image cannot be compressed under 100KB');
              }
              return { blob: minBlob, quality: low };

            } catch (error) {
              throw error;
            }
          };

          findOptimalQuality()
            .then(({ blob }) => {
              resolve({
                url: URL.createObjectURL(blob),
                name: fileName,
                format: 'jpg',
                size: blob.size,
                dimensions: { width: targetWidth, height: targetHeight }
              });
            })
            .catch(reject);
        }
      };
      
      img.onerror = () => reject('Failed to load image');
      img.src = reader.result;
    };

    reader.onerror = () => reject('Failed to read file');
    reader.readAsDataURL(file);
  });
};
