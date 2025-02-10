chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'saveScreenshot') {
    const { dataUrl } = message;
    
    // Convert data URL to blob
    fetch(dataUrl)
      .then(res => res.blob())
      .then(blob => {
        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `screenshot-${timestamp}.png`;
        
        // Trigger download
        chrome.downloads.download({
          url: URL.createObjectURL(blob),
          filename,
          saveAs: true
        });
      });
  }
});