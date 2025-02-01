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
          // Compress PNG as much as possible, but always return the image
          const processPNG = (quality = 0.7, attempt = 0) => {
            canvas.toBlob(blob => {
              if (!blob) return reject('Blob creation failed');

              // Always resolve, even if size is above 100KB
              resolve({
                url: URL.createObjectURL(blob),
                name: fileName,
                format: 'png',
                size: blob.size,
                dimensions: { width: targetWidth, height: targetHeight }
              });
            }, 'image/png', quality);
          };

          processPNG();
        } else {
          // For JPGs, enforce size under 100KB
          const processJPG = (quality = 0.8, attempt = 0) => {
            canvas.toBlob(blob => {
              if (!blob) return reject('Blob creation failed');

              if (blob.size <= 100 * 1024) {
                resolve({
                  url: URL.createObjectURL(blob),
                  name: fileName,
                  format: 'jpg',
                  size: blob.size,
                  dimensions: { width: targetWidth, height: targetHeight }
                });
              } else {
                if (quality >= 0.3) {
                  return processJPG(quality - 0.15, attempt + 1);
                }
                reject('Image cannot be compressed under 100KB');
              }
            }, 'image/jpeg', quality);
          };

          processJPG();
        }
      };
      
      img.onerror = () => reject('Failed to load image');
      img.src = reader.result;
    };

    reader.onerror = () => reject('Failed to read file');
    reader.readAsDataURL(file);
  });
};