import { jsPDF } from 'jspdf';

interface ScreenshotMessage {
  action: 'saveScreenshot';
  dataUrl: string;
  format: string;
}

interface ErrorMessage {
  action: 'captureError';
  error: string;
}

type Message = ScreenshotMessage | ErrorMessage;

async function convertToPDF(dataUrl: string): Promise<string> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  
  const pdf = new jsPDF();
  const img = new Image();
  
  return new Promise((resolve, reject) => {
    img.onload = () => {
      try {
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (img.height * pdfWidth) / img.width;
        pdf.addImage(img, 'PNG', 0, 0, pdfWidth, pdfHeight);
        resolve(pdf.output('dataurlstring'));
      } catch (err) {
        reject(err instanceof Error ? err : new Error('PDF conversion failed'));
      } finally {
        URL.revokeObjectURL(blobUrl);
      }
    };
    img.onerror = () => reject(new Error('Failed to load image for PDF conversion'));
    img.src = blobUrl;
  });
}

chrome.runtime.onMessage.addListener((message: Message, sender) => {
  if (message.action === 'saveScreenshot') {
    const { dataUrl, format } = message;
    
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
          const ctx = canvas.getContext('2d')!;
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
  } else if (message.action === 'captureError') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon128.png',
      title: 'Screenshot Error',
      message: message.error || 'Failed to capture screenshot'
    });
  }
  
  return true;
});