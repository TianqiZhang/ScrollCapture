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

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    const devicePixelRatio = window.devicePixelRatio;

    canvas.width = this.selection.width * devicePixelRatio;
    canvas.height = this.selection.height * devicePixelRatio;

    context.scale(devicePixelRatio, devicePixelRatio);

    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    // Use html2canvas or browser.tabs.captureVisibleTab for actual capture
    // This is a placeholder for the actual capture logic
    const dataUrl = canvas.toDataURL();

    return {
      dataUrl,
      position: { x: scrollX, y: scrollY }
    };
  }

  private async startCapture() {
    this.isCapturing = true;
    this.frames = [];

    const totalHeight = document.documentElement.scrollHeight;
    const viewportHeight = window.innerHeight;
    let currentScroll = 0;

    while (currentScroll < totalHeight && this.isCapturing) {
      const frame = await this.captureFrame();
      this.frames.push(frame);

      currentScroll += viewportHeight;
      window.scrollTo(0, currentScroll);

      // Wait for any dynamic content to load
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    await this.stitchFrames();
  }

  private async stitchFrames() {
    if (this.frames.length === 0) return;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    const devicePixelRatio = window.devicePixelRatio;

    // Calculate final dimensions
    const maxWidth = Math.max(...this.frames.map(f => f.position.x + this.selection!.width));
    const maxHeight = Math.max(...this.frames.map(f => f.position.y + this.selection!.height));

    canvas.width = maxWidth * devicePixelRatio;
    canvas.height = maxHeight * devicePixelRatio;
    context.scale(devicePixelRatio, devicePixelRatio);

    // Draw frames
    for (const frame of this.frames) {
      const img = new Image();
      img.src = frame.dataUrl;
      await new Promise(resolve => {
        img.onload = resolve;
      });
      context.drawImage(img, frame.position.x, frame.position.y);
    }

    // Send final image to background script
    chrome.runtime.sendMessage({
      action: 'saveScreenshot',
      dataUrl: canvas.toDataURL()
    });
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