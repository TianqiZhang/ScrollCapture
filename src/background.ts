// Background script that handles screenshot saving and PDF conversion
function blobToBase64(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

async function convertToPDF(dataUrl) {
  try {
    const img = await fetch(dataUrl);
    const blob = await img.blob();
    const blobUrl = URL.createObjectURL(blob);

    // Create a PDF
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const pdfImg = new Image();

    return new Promise((resolve, reject) => {
      pdfImg.onload = async () => {
        try {
          canvas.width = pdfImg.width;
          canvas.height = pdfImg.height;
          ctx.drawImage(pdfImg, 0, 0);
          
          // Convert to PDF using canvas data
          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          resolve(imgData);
        } catch (err) {
          reject(err);
        } finally {
          URL.revokeObjectURL(blobUrl);
        }
      };
      pdfImg.onerror = () => reject(new Error('Failed to load image for PDF conversion'));
      pdfImg.src = blobUrl;
    });
  } catch (err) {
    console.error('PDF conversion failed:', err);
    throw err;
  }
}

// Background script for handling screenshot capture and saving
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);

  if (message.action === 'captureTab') {
    console.log('Capturing tab with bounds:', message.bounds);
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error('Capture failed:', chrome.runtime.lastError);
        sendResponse({ error: chrome.runtime.lastError.message });
        return;
      }
      console.log('Tab captured successfully');
      sendResponse({ dataUrl });
    });
    return true; // Keep message channel open for async response
  }
  
  if (message.action === 'saveScreenshot') {
    const { dataUrl, format } = message;
    console.log('Saving screenshot in format:', format);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = format.toLowerCase();
    const filename = `screenshot-${timestamp}.${extension}`;
    
    (async () => {
      try {
        let finalDataUrl = dataUrl;
        
        if (format === 'pdf') {
          finalDataUrl = await convertToPDF(dataUrl);
        } else if (format === 'jpeg') {
          const img = await fetch(dataUrl);
          const blob = await img.blob();
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const image = await createImageBitmap(blob);
          canvas.width = image.width;
          canvas.height = image.height;
          ctx.drawImage(image, 0, 0);
          finalDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        }

        const response = await fetch(finalDataUrl);
        const blob = await response.blob();
        
        chrome.downloads.download({
          url: URL.createObjectURL(blob),
          filename,
          saveAs: true
        });

        if (sender.tab?.id) {
          chrome.tabs.sendMessage(sender.tab.id, {
            action: 'captureComplete',
            success: true
          });
        }
      } catch (err) {
        console.error('Failed to save screenshot:', err);
        if (sender.tab?.id) {
          chrome.tabs.sendMessage(sender.tab.id, {
            action: 'captureComplete',
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error occurred'
          });
        }
      }
    })();
    return true;
  }
  
  if (message.action === 'captureError') {
    console.error('Capture error:', message.error);
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon128.png',
      title: 'Screenshot Error',
      message: message.error || 'Failed to capture screenshot'
    });
    return true;
  }
});