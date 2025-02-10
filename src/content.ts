// Content script for screenshot capture functionality
class ScreenshotCapture {
  private frames: Array<{dataUrl: string; position: {x: number; y: number}}> = [];
  private isCapturing = false;
  private selection: { x: number; y: number; width: number; height: number } | null = null;
  private overlay: HTMLDivElement | null = null;
  private selectionBox: HTMLDivElement | null = null;
  private progressBar: HTMLDivElement | null = null;

  constructor() {
    console.log('ScreenshotCapture initialized');
    this.initializeOverlay();
    this.setupEventListeners();
  }

  private initializeOverlay() {
    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'screenshot-overlay';
    document.body.appendChild(this.overlay);

    // Create selection box
    this.selectionBox = document.createElement('div');
    this.selectionBox.className = 'screenshot-selection';
    this.overlay.appendChild(this.selectionBox);

    // Create progress bar
    this.progressBar = document.createElement('div');
    this.progressBar.className = 'screenshot-progress';
    this.progressBar.style.display = 'none';
    document.body.appendChild(this.progressBar);

    console.log('Overlay elements created');
  }

  private setupEventListeners() {
    if (!this.overlay || !this.selectionBox) return;

    let isSelecting = false;
    let startX = 0;
    let startY = 0;

    this.overlay.addEventListener('mousedown', (e) => {
      console.log('Mouse down on overlay');
      isSelecting = true;
      startX = e.clientX;
      startY = e.clientY;
      
      this.selectionBox!.style.left = `${startX}px`;
      this.selectionBox!.style.top = `${startY}px`;
      this.selectionBox!.style.width = '0';
      this.selectionBox!.style.height = '0';
      this.selectionBox!.style.display = 'block';
    });

    this.overlay.addEventListener('mousemove', (e) => {
      if (!isSelecting) return;

      const width = e.clientX - startX;
      const height = e.clientY - startY;

      this.selectionBox!.style.width = `${Math.abs(width)}px`;
      this.selectionBox!.style.height = `${Math.abs(height)}px`;
      this.selectionBox!.style.left = `${width > 0 ? startX : e.clientX}px`;
      this.selectionBox!.style.top = `${height > 0 ? startY : e.clientY}px`;
    });

    this.overlay.addEventListener('mouseup', () => {
      console.log('Mouse up, ending selection');
      isSelecting = false;
      const rect = this.selectionBox!.getBoundingClientRect();
      this.selection = {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height
      };
      this.startCapture();
    });
  }

  private async startCapture() {
    console.log('Starting capture process');
    if (!this.selection) return;

    try {
      // Request background script to handle the capture since it has the required permissions
      chrome.runtime.sendMessage({
        action: 'captureTab',
        bounds: this.selection
      }, async (response) => {
        if (chrome.runtime.lastError) {
          console.error('Capture failed:', chrome.runtime.lastError);
          return;
        }
        
        if (response && response.dataUrl) {
          // Process the captured image
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = this.selection!.width;
            canvas.height = this.selection!.height;
            const ctx = canvas.getContext('2d');
            
            ctx!.drawImage(
              img,
              this.selection!.x, this.selection!.y,
              this.selection!.width, this.selection!.height,
              0, 0,
              this.selection!.width, this.selection!.height
            );

            // Send the cropped image back to background script for saving
            chrome.runtime.sendMessage({
              action: 'saveScreenshot',
              dataUrl: canvas.toDataURL(),
              format: 'png'
            });
          };
          img.src = response.dataUrl;
        }
      });
    } catch (err) {
      console.error('Capture failed:', err);
      chrome.runtime.sendMessage({
        action: 'captureError',
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    } finally {
      this.cleanup();
    }
  }

  private cleanup() {
    console.log('Cleaning up capture UI');
    if (this.overlay) {
      this.overlay.style.display = 'none';
    }
    if (this.progressBar) {
      this.progressBar.style.display = 'none';
    }
    this.selection = null;
  }

  public start() {
    console.log('Starting screenshot capture UI');
    if (this.overlay) {
      this.overlay.style.display = 'block';
    }
  }
}

// Initialize capture functionality when script loads
console.log('Content script loaded');
const screenshotCapture = new ScreenshotCapture();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message);
  if (message.action === 'startCapture') {
    screenshotCapture.start();
    sendResponse({ success: true });
  }
  return true;
});