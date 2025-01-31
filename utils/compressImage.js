// compressImage.js
export const resizeAndCompressImage = (file, fileName) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = () => {
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const targetWidth = 825;
        const aspectRatio = img.height / img.width;
        
        canvas.width = targetWidth;
        canvas.height = Math.round(targetWidth * aspectRatio);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Detect transparency
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const hasTransparency = [...imageData.data].some((_, i) => i % 4 === 3 && imageData.data[i] < 255);
        const format = hasTransparency ? 'png' : 'jpeg';

        const compress = (quality = 0.6) => {
          canvas.toBlob(blob => {
            if (!blob) return reject('Blob creation failed');
            
            if (blob.size <= 100 * 1024) {
              resolve({
                url: URL.createObjectURL(blob),
                name: fileName,
                format: format,
                size: blob.size
              });
            } else {
              // Aggressive quality reduction
              const newQuality = quality - (hasTransparency ? 0.15 : 0.1);
              if (newQuality >= 0.3) {
                compress(newQuality);
              } else {
                // Final fallback: convert to JPEG if possible
                if (hasTransparency) {
                  ctx.fillStyle = 'white';
                  ctx.globalCompositeOperation = 'destination-over';
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
                canvas.toBlob(fallbackBlob => {
                  resolve({
                    url: URL.createObjectURL(fallbackBlob),
                    name: fileName,
                    format: 'jpeg',
                    size: fallbackBlob.size
                  });
                }, 'image/jpeg', 0.5);
              }
            }
          }, `image/${format}`, quality);
        };

        compress();
      };
      
      img.onerror = () => reject('Failed to load image');
      img.src = reader.result;
    };

    reader.onerror = () => reject('Failed to read file');
    reader.readAsDataURL(file);
  });
};