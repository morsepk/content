'use client';
import { useState, useRef, useEffect } from "react";
import { resizeAndCompressImage } from "../utils/compressImage";

export default function Home() {
  const [clientName, setClientName] = useState("");
  const [processedImages, setProcessedImages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedContent, setProcessedContent] = useState("");
  const contentEditableRef = useRef(null);
  const outputEditableRef = useRef(null);

  useEffect(() => {
    const savedClient = localStorage.getItem('lastClient');
    if (savedClient) setClientName(savedClient);
  }, []);

  const handlePaste = (e) => {
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

  const processContent = async () => {
    const cleanClientName = clientName.trim().toLowerCase();
    if (!cleanClientName) {
      alert("Please enter a client name first.");
      return;
    }

    setIsProcessing(true);
    try {
      const rawHTML = contentEditableRef.current.innerHTML;
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = rawHTML;

      // Process links and clean formatting
      tempDiv.querySelectorAll('a').forEach(a => {
        const href = a.href;
        const isEmbedded = [
          'youtube.com', 'youtu.be',
          'twitter.com', 'x.com',
          'vimeo.com', 'instagram.com'
        ].some(domain => href.includes(domain));
        
        if (!isEmbedded) {
          a.rel = 'nofollow';
          a.target = '_blank';
        }
        // Remove inline styles and classes
        a.removeAttribute('style');
        a.removeAttribute('class');
      });

      // Remove empty image containers
      tempDiv.querySelectorAll('img').forEach(img => {
        const container = img.parentElement;
        img.remove();
        if (container && !container.textContent.trim() && container.children.length === 0) {
          container.remove();
        }
      });

      // Store processed HTML with proper link attributes
      const processedHTML = tempDiv.innerHTML;
      setProcessedContent(processedHTML);

      // Process images with fixed 825px width
      const images = contentEditableRef.current.querySelectorAll('img');
      const date = new Date();
      const month = date.toLocaleString('default', { month: 'short' });
      const day = date.getDate();

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
            for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
            blob = new Blob([ab], { type: mimeType });
          } else {
            const response = await fetch(img.src);
            blob = await response.blob();
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
      
      localStorage.setItem('lastClient', cleanClientName);
      localStorage.setItem(storageKey, lastIndex + images.length);

    } catch (error) {
      console.error("Processing failed:", error);
      alert("Error processing content. Please check the console.");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadImage = async (image) => {
    try {
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: `${image.name}.${image.format}`,
          types: [{
            description: 'Image Files',
            accept: { [`image/${image.format}`]: [`.${image.format}`] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(await fetch(image.url).then(r => r.blob()));
        await writable.close();
      } else {
        const link = document.createElement('a');
        link.href = image.url;
        link.download = `${image.name}.${image.format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error("Download failed:", error);
        alert(`Download failed: ${error.message}`);
      }
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold mb-6">Content Processor</h1>

    <div className="flex items-center justify-center gap-5">
      <input
        type="text"
        placeholder="Enter Client Name"
        value={clientName}
        onChange={(e) => setClientName(e.target.value)}
        className="mb-4 p-2 w-96 border border-gray-400 rounded text-black"
        required
      />
      <button 
        onClick={processContent}
        disabled={isProcessing}
        className="mb-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-500"
      >
        {isProcessing ? 'Processing...' : 'Process Content'}
      </button>

      </div>


      <div className="textHandle w-full h-[80vh] flex items-center justify-center gap-5">
      <div
        ref={contentEditableRef}
        className="w-1/2 h-[75vh] border-2 border-dashed border-white rounded-lg p-6 mb-6 
                 bg-white text-black overflow-auto"
        contentEditable
        placeholder="Paste your content here (text + images)..."
        onPaste={handlePaste}
      ></div>

{processedContent && (
          <div className="prose w-1/2 h-[75vh] border-2 border-dashed border-white rounded-lg p-6 mb-6 
                 bg-white text-black overflow-auto">
            <div
              ref={outputEditableRef}
              contentEditable
              dangerouslySetInnerHTML={{ __html: processedContent }}
              className="outline-none"
            />
          </div>
      )}
      
      </div>
      <div className="imagesHandle mx-12 w-full">
      {processedImages.length > 0 && (
        <div className="w-full max-w-4xl">
          <h2 className="text-3xl font-semibold mb-4">Processed Images</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {processedImages.map((image, index) => (
              <div key={index} className="text-center bg-gray-800 p-4 rounded-lg">
                <img 
                  src={image.url} 
                  alt="Processed" 
                  className="w-full h-48 object-contain mb-2 rounded"
                />
                <p className="text-sm mb-2">{image.name}.{image.format}</p>
                <p className="text-xs text-gray-400 mb-2">
                  {Math.round(image.size/1024)}KB - {image.dimensions.width}x{image.dimensions.height}
                </p>
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
      </div>
    </main>
  );
}