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

        const compress = (quality = 0.9) => {
          canvas.toBlob(blob => {
            if (!blob) return reject('Blob creation failed');
            
            if (blob.size <= 100 * 1024 || quality <= 0.5) {
              resolve({
                url: URL.createObjectURL(blob),
                name: fileName,
                format: format,
                dimensions: { width: canvas.width, height: canvas.height }
              });
            } else {
              compress(quality - 0.05);
            }
          }, `image/${format}`, quality);
        };

        compress(0.9);
      };
      
      img.onerror = () => reject('Failed to load image');
      img.src = reader.result;
    };

    reader.onerror = () => reject('Failed to read file');
    reader.readAsDataURL(file);
  });
};