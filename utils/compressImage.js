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

      // Check if the image has transparency
      const isTransparent = file.type === "image/png";

      const compressAndCheckSize = (blob) => {
        // If the size of the blob is greater than 100KB, we need to reduce the quality
        if (blob.size > 100 * 1024) {
          const quality = 0.7; // Lower the quality slightly to reduce size
          canvas.toBlob(
            (newBlob) => {
              if (newBlob && newBlob.size <= 100 * 1024) {
                const url = URL.createObjectURL(newBlob);
                resolve({ url: url, blob: newBlob });
              } else {
                compressAndCheckSize(newBlob); // Recurse to compress further if still above 100KB
              }
            },
            isTransparent ? "image/png" : "image/jpeg",
            isTransparent ? 1.0 : quality
          );
        } else {
          const url = URL.createObjectURL(blob);
          resolve({ url: url, blob: blob });
        }
      };

      // Convert the canvas to Blob, retaining transparency if applicable
      canvas.toBlob(
        (blob) => {
          if (blob) {
            compressAndCheckSize(blob);
          } else {
            reject("Blob creation failed.");
          }
        },
        isTransparent ? "image/png" : "image/jpeg", // Use PNG for transparency, JPEG otherwise
        isTransparent ? 1.0 : 0.8 // No compression for PNG, moderate compression for JPEG
      );
    };

    img.src = URL.createObjectURL(file);
  });
};
