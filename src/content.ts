import html2canvas from 'html2canvas';

interface CaptureFrame {
  dataUrl: string;
  position: { x: number; y: number };
}

class ScreenshotCapture {
  private frames: CaptureFrame[] = [];
  private isCapturing = false;
  private selection: { x: number; y: number; width: number; height: number } | null = null;
  private overlay: HTMLDivElement | null = null;
  private selectionBox: HTMLDivElement | null = null;
  private progressBar: HTMLDivElement | null = null;

  constructor() {
    this.initializeOverlay();
    this.setupEventListeners();
  }

  private initializeOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'screenshot-overlay';
    this.overlay.style.display = 'none';
    document.body.appendChild(this.overlay);

    this.selectionBox = document.createElement('div');
    this.selectionBox.className = 'screenshot-selection';
    this.overlay.appendChild(this.selectionBox);

    // Add progress bar
    this.progressBar = document.createElement('div');
    this.progressBar.className = 'screenshot-progress';
    this.progressBar.style.display = 'none';
    document.body.appendChild(this.progressBar);
  }

  private updateProgress(percent: number) {
    if (this.progressBar) {
      this.progressBar.style.display = 'block';
      this.progressBar.style.width = `${percent}%`;
      this.progressBar.textContent = `Capturing: ${Math.round(percent)}%`;
    }
  }

  private setupEventListeners() {
    let isSelecting = false;
    let startX = 0;
    let startY = 0;

    this.overlay?.addEventListener('mousedown', (e) => {
      isSelecting = true;
      startX = e.clientX;
      startY = e.clientY;
      if (this.selectionBox) {
        this.selectionBox.style.left = `${startX}px`;
        this.selectionBox.style.top = `${startY}px`;
        this.selectionBox.style.width = '0';
        this.selectionBox.style.height = '0';
      }
    });

    this.overlay?.addEventListener('mousemove', (e) => {
      if (!isSelecting) return;

      const currentX = e.clientX;
      const currentY = e.clientY;
      const width = currentX - startX;
      const height = currentY - startY;

      if (this.selectionBox) {
        this.selectionBox.style.width = `${Math.abs(width)}px`;
        this.selectionBox.style.height = `${Math.abs(height)}px`;
        this.selectionBox.style.left = `${width > 0 ? startX : currentX}px`;
        this.selectionBox.style.top = `${height > 0 ? startY : currentY}px`;
      }
    });

    this.overlay?.addEventListener('mouseup', () => {
      isSelecting = false;
      if (this.selectionBox) {
        const rect = this.selectionBox.getBoundingClientRect();
        this.selection = {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height
        };
        this.startCapture();
      }
    });
  }

  private async captureFrame(): Promise<CaptureFrame> {
    if (!this.selection) throw new Error('No selection area defined');

    // Calculate the area to capture
    const targetElement = document.documentElement;
    const scale = window.devicePixelRatio;
    
    const canvas = await html2canvas(targetElement, {
      scale,
      windowWidth: targetElement.scrollWidth,
      windowHeight: targetElement.scrollHeight,
      x: this.selection.x,
      y: this.selection.y,
      width: this.selection.width,
      height: this.selection.height,
      logging: false,
      useCORS: true,
      allowTaint: true
    });

    return {
      dataUrl: canvas.toDataURL(),
      position: { 
        x: window.scrollX + this.selection.x,
        y: window.scrollY + this.selection.y 
      }
    };
  }

  private async startCapture() {
    this.isCapturing = true;
    this.frames = [];
    
    try {
      if (!this.selection) throw new Error('No selection area defined');

      const totalHeight = document.documentElement.scrollHeight;
      const viewportHeight = window.innerHeight;
      let currentScroll = 0;

      while (currentScroll < totalHeight && this.isCapturing) {
        const progress = (currentScroll / totalHeight) * 100;
        this.updateProgress(progress);

        const frame = await this.captureFrame();
        this.frames.push(frame);

        currentScroll += viewportHeight;
        window.scrollTo(0, currentScroll);

        await new Promise(resolve => setTimeout(resolve, 300));
      }

      this.updateProgress(100);
      await this.stitchFrames();
    } catch (err) {
      console.error('Capture failed:', err);
      chrome.runtime.sendMessage({
        action: 'captureError',
        error: err instanceof Error ? err.message : 'Unknown error occurred'
      });
    } finally {
      this.cleanup();
    }
  }

  private async stitchFrames() {
    if (this.frames.length === 0) return;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    const scale = window.devicePixelRatio;

    // Calculate final dimensions
    const maxWidth = Math.max(...this.frames.map(f => f.position.x + this.selection!.width));
    const maxHeight = Math.max(...this.frames.map(f => f.position.y + this.selection!.height));

    canvas.width = maxWidth * scale;
    canvas.height = maxHeight * scale;
    context.scale(scale, scale);

    // Draw frames in order
    for (const frame of this.frames) {
      const img = new Image();
      img.src = frame.dataUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load frame'));
      });
      
      context.drawImage(
        img,
        frame.position.x,
        frame.position.y,
        this.selection!.width,
        this.selection!.height
      );
    }

    // Send final image to background script
    chrome.runtime.sendMessage({
      action: 'saveScreenshot',
      dataUrl: canvas.toDataURL(),
      format: 'png' // Default format
    });
  }

  private cleanup() {
    this.isCapturing = false;
    if (this.overlay) {
      this.overlay.style.display = 'none';
    }
    if (this.progressBar) {
      this.progressBar.style.display = 'none';
    }
    window.scrollTo(0, 0);
  }

  public start() {
    if (this.overlay) {
      this.overlay.style.display = 'block';
    }
  }

  public stop() {
    this.isCapturing = false;
    if (this.overlay) {
      this.overlay.style.display = 'none';
    }
  }
}

// Initialize capture functionality
const screenshotCapture = new ScreenshotCapture();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'startCapture') {
    screenshotCapture.start();
  }
});