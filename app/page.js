'use client';

import { useState, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { resizeAndCompressImage } from "../utils/compressImage";

export default function Home() {
  const [processedImage, setProcessedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageExtension, setImageExtension] = useState("");

  const sCursorRef = useRef(null);
  const lCursorRef = useRef(null);

  // Cursor movement logic
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (sCursorRef.current && lCursorRef.current) {
        sCursorRef.current.style.left = `${e.clientX}px`;
        sCursorRef.current.style.top = `${e.clientY}px`;

        lCursorRef.current.style.left = `${e.clientX - 20}px`;
        lCursorRef.current.style.top = `${e.clientY - 20}px`;
      }
    };

    document.body.addEventListener("mousemove", handleMouseMove);

    return () => {
      document.body.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const onDrop = async (acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file.type.startsWith("image/")) {
        setImageExtension(file.name.split('.').pop());
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

  useEffect(() => {
    const handlePaste = async (event) => {
      const clipboardData = event.clipboardData || window.clipboardData;
      const items = clipboardData.items;

      for (let i = 0; i < items.length; i++) {
        const file = items[i];
        if (file.type.startsWith("image/")) {
          const imageBlob = file.getAsFile();
          if (imageBlob) {
            setImageExtension(imageBlob.name.split('.').pop());
            setIsProcessing(true);
            const compressedResult = await resizeAndCompressImage(imageBlob);
            if (compressedResult) {
              setProcessedImage(compressedResult);
            }
            setIsProcessing(false);
          }
          break;
        }
      }
    };

    window.addEventListener("paste", handlePaste);

    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, []);

  const downloadImage = async () => {
    if (processedImage) {
      try {
        const suggestedName = `resized-image.${imageExtension}`;
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: suggestedName,
          types: [
            {
              description: "Image Files",
              accept: { [`image/${imageExtension}`]: [`.${imageExtension}`] },
            },
          ],
        });

        const writableStream = await fileHandle.createWritable();
        const response = await fetch(processedImage.url);
        const blob = await response.blob();
        await writableStream.write(blob);
        await writableStream.close();
      } catch (error) {
        if (error.name === "AbortError") {
          console.log("User canceled the save dialog");
        } else {
          console.error("Error while saving the file:", error);
        }
      }
    }
  };

  const { getRootProps, getInputProps } = useDropzone({ onDrop });

  return (
    <>
      {/* Custom Cursors */}
      <div ref={sCursorRef} className="sCursor"></div>
      <div ref={lCursorRef} className="lCursor"></div>

      <main className="min-h-[93vh] bg-black text-white flex flex-col items-center justify-center p-4">
        <div className="flex items-center justify-center gap-5 h-16 mb-5">
          <img
            className="w-12 hover:shadow-glow transition-all duration-500 bg-transparent rounded-full cursor-pointer"
            src="./logo.png"
            alt="Logo"
          />
          <h1 className="text-3xl font-bold">Image Resizer & Compressor</h1>
        </div>

        <div
          {...getRootProps()}
          className="w-96 h-48 border-2 border-dashed border-white rounded-lg p-6 bg-transparent text-center cursor-pointer"
        >
          <input {...getInputProps()} />
          <p className="text-gray-600">
            Drag & drop an image here, or click to select a file.
          </p>
          <p className="text-sm text-gray-400 mt-2">
            You can also press <strong>Ctrl+V</strong> to paste an image.
          </p>
        </div>

        {isProcessing && (
          <p className="mt-4 text-blue-500">Processing your image...</p>
        )}

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
      </main>

      <footer className="flex items-center justify-center text-center text-white bg-[#232323] h-[7vh] max-h-[7vh]">
        <p>
          Built with ❤️ by <span className="font-bold">Mark Maverick</span>
        </p>
      </footer>
    </>
  );
}
