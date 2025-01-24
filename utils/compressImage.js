export const resizeAndCompressImage = (file) => {
  return new Promise((resolve, reject) => {
    const img = new Image();

    const reader = new FileReader();
    reader.onload = () => {
      img.src = reader.result;
    };
    reader.onerror = reject;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      const width = 825; // Fixed width
      const aspectRatio = img.height / img.width;
      const height = width * aspectRatio;

      canvas.width = width;
      canvas.height = height;

      // Clear the canvas to maintain transparency
      ctx.clearRect(0, 0, width, height);

      // Draw the image onto the canvas
      ctx.drawImage(img, 0, 0, width, height);

      const maxBytes = 100 * 1024; // 100 KB
      const isTransparent = file.type === "image/png";

      const compressToTargetSize = (blob, quality = 0.9) => {
        if (blob.size <= maxBytes) {
          const url = URL.createObjectURL(blob);
          resolve({ url: url, blob: blob });
        } else if (quality > 0.1) {
          // Reduce quality for further compression
          canvas.toBlob(
            (newBlob) => {
              if (newBlob) {
                compressToTargetSize(newBlob, quality - 0.1);
              } else {
                reject("Blob creation failed during compression.");
              }
            },
            isTransparent ? "image/webp" : "image/jpeg", // Use WebP for transparent PNGs
            quality
          );
        } else {
          reject("Unable to compress the image below 100KB.");
        }
      };

      // Convert the canvas to Blob, starting with high quality
      canvas.toBlob(
        (blob) => {
          if (blob) {
            // If it's PNG and transparent, start compressing as WebP
            if (isTransparent) {
              compressToTargetSize(blob, 0.9); // WebP compression starts with 0.9 quality
            } else {
              compressToTargetSize(blob, 0.8); // JPEG compression starts with 0.8 quality
            }
          } else {
            reject("Blob creation failed.");
          }
        },
        isTransparent ? "image/webp" : "image/jpeg", // WebP for PNG, JPEG for others
        isTransparent ? 0.9 : 0.8
      );
    };

    img.src = URL.createObjectURL(file);
  });
};
