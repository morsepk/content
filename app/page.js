'use client';
import { useState, useRef, useEffect } from "react";
import { html } from 'js-beautify';
import { resizeAndCompressImage } from "../utils/compressImage";

export default function Home() {
  const [clientName, setClientName] = useState("");
  const [processedImages, setProcessedImages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [processedContent, setProcessedContent] = useState("");
  const contentEditableRef = useRef(null);
  const outputEditableRef = useRef(null);
  const [selected, setSelected] = useState("Sponsored");

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

  const handleReload = () => {
    location.reload();
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
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = rawHTML;






      // Process links and clean formatting
      tempDiv.querySelectorAll("a").forEach((a) => {
        const href = a.href;
        const isEmbedded = [
          "youtube.com", "youtu.be",
          "twitter.com", "x.com",
          "vimeo.com", "instagram.com"
        ].some(domain => href.includes(domain));

        if (!isEmbedded) {
          a.rel = "nofollow";
          a.target = "_blank";
        }
        a.removeAttribute("style");
        a.removeAttribute("class");
      });

      // Remove empty image containers
      tempDiv.querySelectorAll("img").forEach((img) => {
        const container = img.parentElement;
        img.remove();
        if (container && !container.textContent.trim() && container.children.length === 0) {
          container.remove();
        }
      });

      // Processed HTML
      let processedHTML = tempDiv.innerHTML;

      // If "Sponsored" checkbox is checked, add the disclaimer
      if (selected === "Sponsored") {
        processedHTML += ` 
          <hr />
          <p style="text-align: center;"><em>This article is sponsored content. All information is provided by the sponsor and Brave New Coin (BNC) does not endorse or assume responsibility for the content presented, which is not part of BNC’s editorial. Investing in crypto assets involves significant risk, including the potential loss of principal, and readers are strongly encouraged to conduct their own due diligence before engaging with any company or product mentioned. Brave New Coin disclaims any liability for any damages or losses arising from reliance on the content provided in this article.
          </em></p>
        `;
      }

      setProcessedContent(processedHTML);

      // Process images with fixed 825px width
      const images = contentEditableRef.current.querySelectorAll("img");
      const date = new Date();
      const month = date.toLocaleString("default", { month: "short" });
      const day = date.getDate();

      const storageKey = `client-${cleanClientName}`;
      let lastIndex = parseInt(localStorage.getItem(storageKey)) || 0;

      const imageProcessing = Array.from(images).map(async (img, index) => {
        try {
          let blob;
          if (img.src.startsWith("data:")) {
            const byteString = atob(img.src.split(",")[1]);
            const mimeType = img.src.split(":")[1].split(";")[0];
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

      localStorage.setItem("lastClient", cleanClientName);
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




  // Handle "Copy HTML" action
  const handleCopyHTML = () => {
    try {

      setIsCopying(true)

      let htmlContent = processedContent;
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');


      // Remove empty <span> elements
      // const emptySpans = doc.querySelectorAll('span');
      // emptySpans.forEach((span) => {
      //   if (!span.innerHTML.trim()) {
      //     span.remove();
      //   }
      // });


      // Unwrap all span elements (remove span but keep contents)
      doc.querySelectorAll('span').forEach((span) => {
        const parent = span.parentNode;
        while (span.firstChild) {
          parent.insertBefore(span.firstChild, span);
        }
        parent.removeChild(span);
      });

      // Remove empty anchor tags
      doc.querySelectorAll('a').forEach((a) => {
        if (!a.innerHTML.trim()) {
          a.remove();
        }
      });




      const emptyanchors = doc.querySelectorAll('a');
      emptyanchors.forEach((a) => {
        if (!a.innerHTML.trim()) {
          a.remove();
        }
      });
      // Remove empty <span> elements
      const emptyH1 = doc.querySelectorAll('h1');
      emptyH1.forEach((h1) => {
        if (!h1.innerHTML.trim()) {
          h1.remove();
        }
      });
      const emptyH2 = doc.querySelectorAll('h2');
      emptyH2.forEach((h2) => {
        if (!h2.innerHTML.trim()) {
          h2.remove();
        }
      });
      const emptyH3 = doc.querySelectorAll('h3');
      emptyH3.forEach((h3) => {
        if (!h3.innerHTML.trim()) {
          h3.remove();
        }
      });
      const emptyH4 = doc.querySelectorAll('h4');
      emptyH4.forEach((h4) => {
        if (!h4.innerHTML.trim()) {
          h4.remove();
        }
      });
      const emptyH5 = doc.querySelectorAll('h5');
      emptyH5.forEach((h5) => {
        if (!h5.innerHTML.trim()) {
          h5.remove();
        }
      });
      const emptyH6 = doc.querySelectorAll('h6');
      emptyH6.forEach((h6) => {
        if (!h6.innerHTML.trim()) {
          h6.remove();
        }
      });



      const emptyP = doc.querySelectorAll('p');
      emptyP.forEach((p) => {
        if (!p.innerHTML.trim()) {
          p.remove();
        }
      });
      console.log(doc)

      // Remove all instances of non-breaking spaces (&nbsp;)
      const allElements = doc.querySelectorAll('*');
      allElements.forEach((element) => {
        // Check and replace all instances of &nbsp; with an empty string
        element.innerHTML = element.innerHTML.replace(/\u00A0/g, '').replace(/&nbsp;/g, '');
      });


      // remove br tags
      const lineBreaks = doc.querySelectorAll('br');
      lineBreaks.forEach((br) => {
        br.remove();
      });


      // Function to process each element and wrap text nodes
      const processElement = (element) => {
        const style = element.getAttribute('style') || '';

        // Parse font-weight
        let fontWeight = null;
        const fontWeightMatch = style.match(/font-weight\s*:\s*(bold|\d+)/i);
        if (fontWeightMatch) {
          const value = fontWeightMatch[1].toLowerCase();
          fontWeight = value === 'bold' ? 700 : parseInt(value, 10);
        }

        // Parse font-style
        let fontStyle = null;
        const fontStyleMatch = style.match(/font-style\s*:\s*(italic)/i);
        if (fontStyleMatch) {
          fontStyle = fontStyleMatch[1].toLowerCase();
        }

        // Wrap in <strong> if font-weight > 400
        if (fontWeight && fontWeight >= 700) {
          const strong = document.createElement('strong');
          strong.innerHTML = element.innerHTML;
          element.innerHTML = '';
          element.appendChild(strong);
        }

        // Wrap in <em> if font-style is italic
        if (fontStyle === 'italic') {
          const em = document.createElement('em');
          em.innerHTML = element.innerHTML;
          element.innerHTML = '';
          element.appendChild(em);
        }
        // Recursively process child elements
        Array.from(element.children).forEach(processElement);
      };

      // Process the root element (body)
      processElement(doc.body);

      // Step 2: Remove 'dir="ltr"' and filter styles
      const elementsWithDir = doc.querySelectorAll('[dir="ltr"]');
      elementsWithDir.forEach((element) => {
        element.removeAttribute('dir');
      });

      const elementsWithStyle = doc.querySelectorAll('[style]');
      elementsWithStyle.forEach((element) => {
        const currentStyle = element.getAttribute('style');

        // Filter to preserve only "text-align: center"
        const updatedStyle = currentStyle
          .split(';')
          .filter(style => style.includes('text-align: center'))
          .join(';');

        if (updatedStyle) {
          element.setAttribute('style', updatedStyle);
        } else {
          element.removeAttribute('style');
        }
      });

      // Beautify HTML
      htmlContent = doc.body.innerHTML;

      const beautifiedHTML = html(htmlContent, {
        indent_size: 2,
        preserve_newlines: true,
        max_preserve_newlines: 1,
      });

      // Copy to clipboard
      if (navigator.clipboard) {
        navigator.clipboard.writeText(beautifiedHTML).then(() => {
          setTimeout(() => {
            setIsCopying(false); // Reset button text after 2 seconds
          }, 50);
        }).catch((error) => {
          console.error('Failed to copy:', error);
          alert('Failed to copy formatted HTML content.');
        });
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = beautifiedHTML;
        textArea.style.position = 'absolute';
        textArea.style.opacity = 0;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Formatted HTML content copied to clipboard!');
      }
    } catch (error) {
      console.error('Error copying formatted HTML:', error);
      alert('An error occurred while copying formatted HTML content.');
    }
  };





  return (
    <main className="min-h-screen bg-[#e9e9e9] text-white flex flex-col items-center p-6">
      <div onClick={handleReload} className="w-12 h-12 font-extrabold text-4xl flex items-center justify-center rounded-full cursor-pointer bg-blue-600 fixed bottom-12 right-12">&#8593;</div>

      <div className="getClient flex items-center justify-center mb-1 gap-x-5">
        <input
          type="text"
          placeholder="Enter Client Name"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          className="p-2 w-96 border border-gray-400 rounded text-black"
          required
        />
        <div className="p-4 border rounded-lg">
          <label className="flex items-center cursor-pointer text-black">
            <input
              type="checkbox"
              checked={selected === "Sponsored"}
              onChange={() => setSelected(selected === "Post" ? "Sponsored" : "Post")}
              className="mr-2"
            />
            Add Disclaimer
          </label>
        </div>
        <button
          onClick={processContent}
          disabled={isProcessing}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-500"
        >
          {isProcessing ? 'Processing...' : 'Process Content'}
        </button>
        {/* Add Copy HTML Button */}
      <button
        onClick={handleCopyHTML}
        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        {isCopying ? 'Copying⏳...' : 'Copy HTML'}
      </button>
      </div>

      <div className="textHandle w-full h-[52vh] flex items-center justify-center gap-5">
        <div
          ref={contentEditableRef}
          className="w-1/2 h-[50vh] border-2 border-dashed border-white rounded-lg p-6 mb-6 
                 bg-white text-black overflow-auto"
          contentEditable
          placeholder="Paste your content here (text + images)..."
          onPaste={handlePaste}
        ></div>

        <div className="prose w-1/2 h-[50vh] border-2 border-dashed border-white rounded-lg p-6 mb-6 
                 bg-white text-black overflow-auto">
          <div
            ref={outputEditableRef}
            contentEditable
            dangerouslySetInnerHTML={{ __html: processedContent }}
            className="outline-none"
          />
        </div>
      </div>

      
      

      <div className="imagesHandle w-full">
        {processedImages.length > 0 && (
          <div className="w-full">
            <div className="grid grid-cols-6 gap-4">
              {processedImages.map((image, index) => (
                <div key={index} className="text-center bg-[#d3d3d3] p-2 rounded-lg">
                  <img
                    src={image.url}
                    alt="Processed"
                    className="w-full h-48 object-contain mb-2 rounded"
                  />
                  <p className="text-sm text-black font-semibold mb-2">{image.name}.{image.format}</p>
                  <p className="text-xs text-gray-600 mb-2">
                    {Math.round(image.size / 1024)}KB - {image.dimensions.width}x{image.dimensions.height}
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
