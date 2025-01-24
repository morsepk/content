// Assuming resizeAndCompressImage is defined in ../utils/compressImage.js

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
        const height = width * aspectRatio; // Maintain aspect ratio
  
        canvas.width = width;
        canvas.height = height;
  
        ctx.drawImage(img, 0, 0, width, height);
  
        // Convert canvas to Blob to compress
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              resolve({ url: url, blob: blob });
            } else {
              reject("Blob creation failed.");
            }
          },
          "image/jpeg",
          0.8 // Set compression quality (0.8 means 80%)
        );
      };
  
      img.src = URL.createObjectURL(file);
    });
  };
  