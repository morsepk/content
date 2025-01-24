'use client';

import { useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { resizeAndCompressImage } from "../utils/compressImage";

export default function Home() {
  const [processedImage, setProcessedImage] = useState(null); // Stores processed image data
  const [isProcessing, setIsProcessing] = useState(false);   // Tracks image processing state

  // Handle file drop
  const onDrop = async (acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file.type.startsWith("image/")) {
        setIsProcessing(true);
        const compressedResult = await resizeAndCompressImage(file);
        if (compressedResult) {
          setProcessedImage(compressedResult);
        }
        setIsProcessing(false);
      } else {
        alert("Please upload a valid image file.");
      }
    }
  };

  // Listen for paste events and handle image paste
  useEffect(() => {
    const handlePaste = async (event) => {
      const clipboardData = event.clipboardData || window.clipboardData;

      // Check if clipboard contains image data
      const items = clipboardData.items;

      for (let i = 0; i < items.length; i++) {
        const file = items[i];

        if (file.type.startsWith("image/")) {
          const imageBlob = file.getAsFile();
          if (imageBlob) {
            setIsProcessing(true);
            const compressedResult = await resizeAndCompressImage(imageBlob);
            if (compressedResult) {
              setProcessedImage(compressedResult);
            }
            setIsProcessing(false);
          }
          break; // Exit after the first image is found
        }
      }
    };

    // Listen for the paste event (Ctrl+V)
    window.addEventListener("paste", handlePaste);

    return () => {
      // Cleanup listener
      window.removeEventListener("paste", handlePaste);
    };
  }, []);

  // Download the processed image
  const downloadImage = () => {
    if (processedImage) {
      const a = document.createElement("a");
      a.href = processedImage.url;
      a.download = "resized-image.jpg";
      a.click();
    }
  };

  const { getRootProps, getInputProps } = useDropzone({ onDrop });

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <div className="flex items-center justify-center gap-5 h-16 mb-5">
      <img className="w-12 hover:shadow-glow bg-transparent rounded-full cursor-pointer" src="/logo.png" alt="" />
      <h1 className="text-3xl font-bold">Image Resizer & Compressor</h1>
      </div>

      {/* Drag-and-Drop Area */}
      <div
        {...getRootProps()}
        className="w-96 h-48 border-2 border-dashed border-white rounded-lg p-6 bg-transparent text-center cursor-pointer"
      >
        <input {...getInputProps()} />
        <p className="text-gray-600">
          Drag & drop an image here, or click to select a file.
        </p>
        <p className="text-sm text-gray-400 mt-2">You can also press <strong>Ctrl+V</strong> to paste an image.</p>
      </div>

      {/* Processing State */}
      {isProcessing && <p className="mt-4 text-blue-500">Processing your image...</p>}

      {/* Display Processed Image */}
      {processedImage && (
        <div className="mt-6">
          <img
            src={processedImage.url}
            alt="Processed"
            className="w-full max-w-sm rounded-lg border"
          />
          <button
            onClick={downloadImage}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg shadow"
          >
            Download Image
          </button>
        </div>
      )}
      <div>
        <footer className="mt-6 text-center text-gray-400">
          <p className="fixed bottom-0 left-0 right-0 text-center text-white p-4 bg-[#232323]">
            Built with ❤️ by <span className="font-bold">Mark Maverick</span>
              </p></footer>
      </div>
    </main>
  );
}
