// page.js
'use client';
import { useState, useRef } from "react";
import { resizeAndCompressImage } from "../utils/compressImage";
import sanitize from "sanitize-html";

export default function Home() {
  const [clientName, setClientName] = useState("");
  const [processedImages, setProcessedImages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cleanedContent, setCleanedContent] = useState("");
  const contentEditableRef = useRef(null);

  const processContent = async () => {
    if (!clientName.trim()) {
      alert("Please enter a client name first.");
      return;
    }

    setIsProcessing(true);
    try {
      const rawHTML = contentEditableRef.current.innerHTML;

      // Clean HTML content
      const cleanedHTML = sanitize(rawHTML, {
        allowedTags: ['h1', 'h2', 'h3', 'p', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li'],
        allowedAttributes: {
          'a': ['href', 'rel', 'target'],
          'h1': ['style'], 'h2': ['style'], 'h3': ['style'], 'p': ['style']
        },
        transformTags: {
          'a': (tagName, attribs) => ({
            tagName,
            attribs: {
              ...attribs,
              rel: attribs.href?.includes('youtube.com') || 
                   attribs.href?.includes('twitter.com') ? 
                   undefined : 'nofollow',
              target: '_blank'
            }
          })
        }
      });

      setCleanedContent(cleanedHTML);

      // Process images separately
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = rawHTML;
      const images = tempDiv.querySelectorAll('img');
      const date = new Date();
      const month = date.toLocaleString('default', { month: 'short' });
      const day = date.getDate();

      const imageProcessing = Array.from(images).map(async (img, index) => {
        try {
          // Convert dataURL to Blob
          const blob = await fetch(img.src)
            .then(r => r.blob())
            .catch(() => {
              const byteString = atob(img.src.split(',')[1]);
              const mimeString = img.src.split(',')[0].split(':')[1].split(';')[0];
              const ab = new ArrayBuffer(byteString.length);
              const ia = new Uint8Array(ab);
              for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
              }
              return new Blob([ab], { type: mimeString });
            });

          return await resizeAndCompressImage(blob, `${clientName} ${month} ${day}-${index + 1}`);
        } catch (error) {
          console.error(`Error processing image ${index + 1}:`, error);
          return null;
        }
      });

      const processedImages = (await Promise.all(imageProcessing)).filter(Boolean);
      setProcessedImages(processedImages);

    } catch (error) {
      console.error("Processing failed:", error);
      alert("Error processing content. Please check the console.");
    } finally {
      setIsProcessing(false);
    }
  };

  const copyHTML = async () => {
    try {
      await navigator.clipboard.writeText(cleanedContent);
      alert("HTML copied to clipboard!");
    } catch (error) {
      console.error("Copy failed:", error);
      const textarea = document.createElement('textarea');
      textarea.value = cleanedContent;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  };

  const downloadImage = async (image) => {
    try {
      const link = document.createElement('a');
      link.href = image.url;
      link.download = image.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold mb-6">Content Processor</h1>

      <input
        type="text"
        placeholder="Enter Client Name"
        value={clientName}
        onChange={(e) => setClientName(e.target.value)}
        className="mb-4 p-2 w-96 border border-gray-400 rounded text-black"
        required
      />

      <div
        ref={contentEditableRef}
        className="w-full max-w-4xl h-96 border-2 border-dashed border-white rounded-lg p-6 mb-6 
                 bg-white text-black overflow-auto"
        contentEditable
        placeholder="Paste your formatted content here (text + images)..."
        onPaste={(e) => {
          const items = e.clipboardData.items;
          for (const item of items) {
            if (item.type.startsWith('image/')) {
              const blob = item.getAsFile();
              const reader = new FileReader();
              reader.onload = () => {
                const img = document.createElement('img');
                img.src = reader.result;
                document.execCommand('insertHTML', false, img.outerHTML);
              };
              reader.readAsDataURL(blob);
            }
          }
        }}
      ></div>

      <button 
        onClick={processContent}
        disabled={isProcessing}
        className="mb-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-500"
      >
        {isProcessing ? 'Processing...' : 'Process Content'}
      </button>

      {cleanedContent && (
        <div className="w-full max-w-4xl mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Cleaned Content</h2>
            <button 
              onClick={copyHTML}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Copy HTML
            </button>
          </div>
          <div 
            className="prose max-w-none bg-white p-6 rounded-lg border border-gray-200 text-black"
            dangerouslySetInnerHTML={{ __html: cleanedContent }}
          />
        </div>
      )}

      {processedImages.length > 0 && (
        <div className="w-full max-w-4xl">
          <h2 className="text-xl font-semibold mb-4">Processed Images</h2>
          <div className="grid grid-cols-3 gap-4">
            {processedImages.map((image, index) => (
              <div key={index} className="text-center bg-gray-800 p-4 rounded-lg">
                <img 
                  src={image.url} 
                  alt="Processed" 
                  className="w-full h-48 object-contain mb-2 rounded"
                />
                <p className="text-sm mb-2">{image.name}.{image.format}</p>
                <button 
                  onClick={() => downloadImage(image)}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Download
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}