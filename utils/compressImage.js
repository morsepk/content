export const resizeAndCompressImage = (file, outputFormat = "jpeg") => {
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

      const width = 825;
      const aspectRatio = img.height / img.width;
      const height = width * aspectRatio;

      canvas.width = width;
      canvas.height = height;

      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const maxBytes = Math.max(100 * 1024, file.size * 0.2);
      const isTransparent = file.type === "image/png";

      const compressToTargetSize = (blob, quality = 0.9) => {
        if (blob.size <= maxBytes) {
          const url = URL.createObjectURL(blob);
          resolve({ url: url, blob: blob });
        } else if (quality > 0.1) {
          canvas.toBlob(
            (newBlob) => {
              if (newBlob) {
                compressToTargetSize(newBlob, quality - 0.05); // Smaller steps
              } else {
                reject("Blob creation failed during compression.");
              }
            },
            `image/${outputFormat}`,
            quality
          );
        } else {
          reject("Unable to compress the image below target size.");
        }
      };

      canvas.toBlob(
        (blob) => {
          if (blob) {
            compressToTargetSize(blob, 0.9);
          } else {
            reject("Blob creation failed.");
          }
        },
        isTransparent ? "image/png" : `image/${outputFormat}`,
        0.9
      );
    };

    img.src = URL.createObjectURL(file);
  });
};
