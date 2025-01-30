// page.js
'use client';
import { useState, useRef, useEffect } from "react";
import { resizeAndCompressImage } from "../utils/compressImage";
import sanitize from "sanitize-html";

export default function Home() {
  const [clientName, setClientName] = useState("");
  const [processedImages, setProcessedImages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cleanedContent, setCleanedContent] = useState("");
  const contentEditableRef = useRef(null);

  useEffect(() => {
    const savedClient = localStorage.getItem('lastClient');
    if (savedClient) setClientName(savedClient);
  }, []);

  const processContent = async () => {
    const cleanClientName = clientName.trim().toLowerCase();
    if (!cleanClientName) {
      alert("Please enter a client name first.");
      return;
    }

    setIsProcessing(true);
    try {
      const rawHTML = contentEditableRef.current.innerHTML;

      const cleanedHTML = sanitize(rawHTML, {
        allowedTags: ['h1', 'h2', 'h3', 'p', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li', 'br'],
        allowedAttributes: {
          'a': ['href', 'rel', 'target'],
          'h1': ['style'], 'h2': ['style'], 'h3': ['style'], 'p': ['style']
        },
        transformTags: {
          'a': (tagName, attribs) => {
            const isEmbedded = [
              'youtube.com', 'youtu.be',
              'twitter.com', 'x.com',
              'vimeo.com', 'instagram.com'
            ].some(domain => attribs.href?.includes(domain));

            return {
              tagName,
              attribs: {
                ...attribs,
                rel: isEmbedded ? undefined : 'nofollow',
                target: isEmbedded ? undefined : '_blank'
              }
            };
          },
          'p': (tagName, attribs) => {
            const style = attribs.style || '';
            const fontSizeMatch = style.match(/font-size:\s*(\d+)px/);
            const fontSize = fontSizeMatch ? parseInt(fontSizeMatch[1]) : 0;
            
            if (fontSize > 24) return { tagName: 'h1', attribs: {} };
            if (fontSize > 20) return { tagName: 'h2', attribs: {} };
            if (fontSize > 18) return { tagName: 'h3', attribs: {} };
            return { tagName, attribs };
          }
        }
      });

      setCleanedContent(cleanedHTML);

      // Process images
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = rawHTML;
      const images = tempDiv.querySelectorAll('img');
      const date = new Date();
      const month = date.toLocaleString('default', { month: 'short' });
      const day = date.getDate();

      // Get/create image index
      const storageKey = `client-${cleanClientName}`;
      let lastIndex = parseInt(localStorage.getItem(storageKey)) || 0;

      const imageProcessing = Array.from(images).map(async (img, index) => {
        try {
          let blob;
          if (img.src.startsWith('data:')) {
            const byteString = atob(img.src.split(',')[1]);
            const mimeType = img.src.split(':')[1].split(';')[0];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
            }
            blob = new Blob([ab], { type: mimeType });
          } else {
            blob = await fetch(img.src).then(r => r.blob());
          }

          const imageNumber = lastIndex + index + 1;
          return await resizeAndCompressImage(
            blob, 
            `${cleanClientName}-${month}-${day}-${imageNumber}`
          );
        } catch (error) {
          console.error(`Image ${index + 1} failed:`, error);
          return null;
        }
      });

      const processedImages = (await Promise.all(imageProcessing)).filter(Boolean);
      setProcessedImages(processedImages);
      
      // Update storage
      localStorage.setItem('lastClient', cleanClientName);
      localStorage.setItem(storageKey, lastIndex + images.length);

    } catch (error) {
      console.error("Processing failed:", error);
      alert("Error processing content. Please check the console.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaste = async (e) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const blob = item.getAsFile();
        const reader = new FileReader();
        
        reader.onload = () => {
          const range = document.getSelection().getRangeAt(0);
          const img = document.createElement('img');
          img.src = reader.result;
          range.insertNode(img);
        };
        
        reader.readAsDataURL(blob);
      }
    }
  };

  const copyHTML = async () => {
    try {
      await navigator.clipboard.writeText(cleanedContent);
      alert("HTML copied to clipboard!");
    } catch (error) {
      const textarea = document.createElement('textarea');
      textarea.value = cleanedContent;
      document.body.appendChild(textarea);
      textarea.select();
      document.body.removeChild(textarea);
      alert("HTML copied to clipboard!");
    }
  };

  const downloadImage = async (image) => {
    try {
      const link = document.createElement('a');
      link.href = image.url;
      link.download = `${image.name}.${image.format}`;
      
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: link.download,
          types: [{
            description: 'Image Files',
            accept: { [`image/${image.format}`]: [`.${image.format}`] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(await fetch(image.url).then(r => r.blob()));
        await writable.close();
      } else {
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error("Download failed:", error);
      }
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
        onPaste={handlePaste}
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